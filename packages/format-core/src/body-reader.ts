import type { BodySpec } from "./body-spec.js";

/** Construction options for {@link BodyReader}. */
export interface BodyReaderOptions {
	/**
	 * Called with `true` when the body's internal queue is full and upstream
	 * delivery should pause, and `false` when the consumer has pulled and
	 * upstream may resume. A body reader has no transport of its own — this is
	 * how it reaches back to whichever one is feeding it.
	 */
	onBackpressure(paused: boolean): void;
}

/**
 * Turns a declared {@link BodySpec} into a `ReadableStream`, fed byte-by-byte
 * (or chunk-by-chunk) as they arrive alongside or after a decoded value.
 *
 * Extracted from `net/core`'s `Framer` (now `FrameLink`) so the same
 * deferred-materialization mechanics — an opaque payload declared by a decoder
 * and streamed rather than buffered — are available to any consumer, not just a
 * live transport. First consumer: `FrameLink`; a RIFF/WAV reader or an IMAP
 * literal retrofit are the next two, per `format-interface-dimensions.md`.
 */
export class BodyReader {
	private controller!: ReadableStreamDefaultController<Uint8Array>;
	private remaining: number;
	private done = false;

	/** The stream to hand to whoever is consuming the body. */
	readonly stream: ReadableStream<Uint8Array>;

	constructor(
		spec: BodySpec,
		private readonly options: BodyReaderOptions,
	) {
		this.remaining =
			spec.mode === "length" ? spec.byteLength : Number.POSITIVE_INFINITY;

		const onBackpressure = (paused: boolean) => options.onBackpressure(paused);
		this.stream = new ReadableStream<Uint8Array>({
			start: (controller) => {
				this.controller = controller;
			},
			pull() {
				onBackpressure(false);
			},
		});
	}

	/**
	 * Push up to `remaining` bytes of `chunk` into the stream.
	 *
	 * @returns How many bytes of `chunk` were consumed by the body.
	 */
	feed(chunk: Uint8Array): number {
		if (this.done) {
			return 0;
		}
		const take = chunk.length < this.remaining ? chunk.length : this.remaining;
		if (take > 0) {
			this.controller.enqueue(
				take === chunk.length ? chunk : chunk.subarray(0, take),
			);
			this.remaining -= take;
			// desiredSize <= 0 means the consumer has not drained what it already has.
			if ((this.controller.desiredSize ?? 0) <= 0) {
				this.options.onBackpressure(true);
			}
		}
		if (this.remaining === 0) {
			this.finish();
		}
		return take;
	}

	/** Signals end-of-input for an `until-eof` body; a no-op for a `length` one. */
	finishAtEof(): void {
		if (this.remaining === Number.POSITIVE_INFINITY) {
			this.finish();
		}
	}

	/** Closes the stream normally. Idempotent: a second call is a no-op. */
	finish(): void {
		if (this.done) {
			return;
		}
		this.done = true;
		this.controller.close();
	}

	/**
	 * Errors the stream, for a transport failure or a mode switch mid-body.
	 * Idempotent: a second call is a no-op.
	 */
	discard(error?: unknown): void {
		if (this.done) {
			return;
		}
		this.done = true;
		this.controller.error(error ?? new Error("Body reader discarded"));
	}
}
