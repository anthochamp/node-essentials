import type { DecodeBuffer } from "./decode-buffer.js";
import type { DecodeContext } from "./decode-context.js";
import type { DecodeSink } from "./decode-sink.js";
import type { Decoder } from "./decoder.js";
import type { IdlePolicy } from "./idle-policy.js";

/** Construction options for {@link DecodeDriver}. */
export interface DecodeDriverOptions<T, View, Chunk, W> {
	/** The decoder driven by this instance. Stateful decoders are supported. */
	readonly decoder: Decoder<T, View, W>;

	/** The buffer accumulated input is windowed through. */
	readonly buffer: DecodeBuffer<View, Chunk>;

	/** Receives every decode outcome. See {@link DecodeSink}. */
	readonly sink: DecodeSink<T, W>;

	/** How to wait when the decoder needs silence to delimit a value. */
	readonly idle: IdlePolicy;
}

/**
 * Drives a {@link Decoder} over a {@link DecodeBuffer}, dispatching every outcome
 * to a {@link DecodeSink}.
 *
 * This is the one engine shared by every consumption shape: `decodeAll`
 * (one-shot, `idle: {kind: "exhausted"}`), `DecodeStream` (Web Streams, `idle:
 * {kind: "exhausted"}` at flush time), and `net/core`'s `FrameLink` (live,
 * `idle: {kind: "timer", schedule}` backed by a real clock). Before this
 * existed, the same accumulate-and-dispatch loop was hand-written three times —
 * `Framer.drain`/`Framer.handleSilenceTimeout`, `CborSequenceDecoder`, and
 * `NdjsonParseStream` — each slightly differently.
 *
 * Message-mode datagrams (one transport delivery = one complete value, no state
 * carried between deliveries) are deliberately out of scope: call the decoder
 * directly for that case, as `FrameLink` does. A buffer that never accumulates
 * across calls gains nothing from this class.
 *
 * @template T - The decoded value type.
 * @template View - What the decoder reads. Matches the buffer's view type.
 * @template Chunk - What {@link write} accepts. Matches the buffer's chunk
 *   type.
 * @template W - The decoder's warning type.
 */
export class DecodeDriver<T, View = Uint8Array, Chunk = View, W = never> {
	private decoder: Decoder<T, View, W>;
	private readonly buffer: DecodeBuffer<View, Chunk>;
	private readonly sink: DecodeSink<T, W>;
	private readonly idle: IdlePolicy;

	private needAtLeast = 0;
	private cancelTimer: (() => void) | null = null;
	private atEof = false;
	private closed = false;

	/** Bumped by `clear` so a reentrant callback's in-flight loop bails out. */
	private generation = 0;

	constructor(options: DecodeDriverOptions<T, View, Chunk, W>) {
		this.decoder = options.decoder;
		this.buffer = options.buffer;
		this.sink = options.sink;
		this.idle = options.idle;
	}

	/** Unconsumed input currently held. */
	get buffered(): number {
		return this.buffer.buffered;
	}

	/** New input arrived: append it and decode as much as possible. */
	write(chunk: Chunk): void {
		if (this.closed) {
			return;
		}
		this.cancelPendingTimer();
		this.buffer.append(chunk);
		this.pump({ timedOut: false, atEof: this.atEof });
	}

	/**
	 * No more input will ever arrive. Triggers a final decode attempt and, if the
	 * decoder is still inconclusive, reports {@link DecodeSink.onTruncated}.
	 */
	close(): void {
		if (this.closed || this.atEof) {
			return;
		}
		this.atEof = true;
		this.cancelPendingTimer();
		this.buffer.finish?.();
		this.pump({ timedOut: false, atEof: true });
	}

	/** Discard buffered input and decoder state, ahead of a mode switch. */
	clear(): void {
		this.resync();
		this.buffer.clear();
		this.decoder.reset?.();
	}

	/**
	 * Cancel any pending idle timer and reset the incomplete-hint, without
	 * discarding buffered input. Used ahead of an operation that changes decode
	 * semantics mid-stream (a codec or transport swap) but must keep unconsumed
	 * input for whatever reads it next.
	 */
	resync(): void {
		this.generation++;
		this.cancelPendingTimer();
		this.needAtLeast = 0;
	}

	/**
	 * Replace the decoder, keeping buffered input for the new one to interpret
	 * (an RTMP handshake completing, an SMTP session negotiating a new mode).
	 */
	swapDecoder(decoder: Decoder<T, View, W>): void {
		this.resync();
		this.decoder = decoder;
	}

	/** Discard buffered input without touching decoder state. */
	discardBuffer(): void {
		this.resync();
		this.buffer.clear();
	}

	/** Remove and return the buffered input without discarding decoder state. */
	takeResidue(): Chunk {
		this.resync();
		return this.buffer.take();
	}

	private pump(context: DecodeContext): void {
		const generation = this.generation;

		for (;;) {
			if (
				this.closed ||
				generation !== this.generation ||
				this.buffer.buffered === 0
			) {
				return;
			}
			if (this.needAtLeast > 0 && this.buffer.buffered < this.needAtLeast) {
				return;
			}

			const result = this.decoder.decode(this.buffer.view(), context);

			if (result.status === "decoded") {
				this.needAtLeast = 0;
				this.buffer.consume(result.consumed);
				this.sink.onDecoded(result.value, result.consumed, {
					body: result.body,
					warnings: result.warnings,
				});
				continue;
			}

			if (result.status === "skip") {
				this.needAtLeast = 0;
				this.buffer.consume(result.consumed);
				continue;
			}

			if (result.status === "error") {
				this.needAtLeast = 0;
				this.buffer.consume(result.consumed);
				this.sink.onError(result.error, result.consumed);
				continue;
			}

			if (result.status === "fatal") {
				this.closed = true;
				this.sink.onFatal(result.error);
				return;
			}

			if (result.status === "pending") {
				this.handlePending(result.frameTimeout, context);
				return;
			}

			// incomplete
			if (context.atEof) {
				this.closed = true;
				this.sink.onTruncated(result.needAtLeast);
				return;
			}
			this.needAtLeast = result.needAtLeast ?? 0;
			this.sink.onIncomplete(result.needAtLeast);
			return;
		}
	}

	private handlePending(frameTimeout: number, context: DecodeContext): void {
		if (context.atEof) {
			if (context.timedOut) {
				// Already retried once at EOF and still pending: nothing left to
				// wait for.
				this.closed = true;
				this.sink.onTruncated(undefined);
				return;
			}
			this.pump({ ...context, timedOut: true });
			return;
		}

		if (this.idle.kind === "exhausted") {
			// No timer exists to observe time passing; the only way this policy
			// can find out silence has become permanent is being closed.
			this.pump({ ...context, timedOut: true, atEof: true });
			return;
		}

		// idle.kind === "timer": always re-arm, even if a previously fired timer
		// already set timedOut and the decoder is still pending — a decoder that
		// needs several silence windows in a row must keep getting them.
		this.sink.onPending(frameTimeout);
		this.cancelTimer = this.idle.schedule(frameTimeout, () => {
			this.cancelTimer = null;
			this.pump({ ...context, timedOut: true });
		});
	}

	private cancelPendingTimer(): void {
		this.cancelTimer?.();
		this.cancelTimer = null;
	}
}
