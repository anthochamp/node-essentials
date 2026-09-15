import { EventDispatcherMapBase, IEventDispatcherMap } from "@ac-kit/async";
import { ByteAccumulator, Timer } from "@ac-kit/core";
import {
	BodyReader,
	type BodySpec,
	type Codec,
	type DecodeContext,
	DecodeDriver,
	type DecodeSink,
} from "@ac-kit/format-core";

import { FrameSink } from "./frame-sink.js";
import type { Transport, TransportHandlers } from "./transport.js";

export class FrameLinkError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "FrameLinkError";
	}
}

export class FrameLinkTransportError extends FrameLinkError {
	constructor(options?: ErrorOptions) {
		super("Transport failed", options);
		this.name = "FrameLinkTransportError";
	}
}

export class FrameLinkProtocolError extends FrameLinkError {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "FrameLinkProtocolError";
	}
}

export class FrameLinkDestroyedError extends FrameLinkError {
	constructor() {
		super("Connection closed");
		this.name = "FrameLinkClosedError";
	}
}

/** Lifecycle events emitted by a {@link FrameLink}. */
export type FrameLinkEvents = {
	/**
	 * A recoverable protocol violation. Framing is intact and decoding continues;
	 * in-flight exchanges are unaffected.
	 */
	protocolError: [error: unknown];

	/**
	 * A fatal error. The transport has been torn down and the link is no longer
	 * usable.
	 */
	error: [error: unknown];

	/** The peer half-closed. No further values will be decoded. */
	end: [];

	/** The transport is fully closed. */
	close: [];
};

export type FrameLinkOptions<In, Out> = {
	/** Carrier for the framed bytes. */
	transport: Transport;

	/** Decoder and encoder for this protocol. */
	codec: Codec<In, Out>;

	/** Destination for decoded values. */
	sink: FrameSink<In>;

	/**
	 * Hard ceiling, in bytes, on undecoded received data.
	 *
	 * Required and deliberately without a default: this is the boundary that
	 * stops a peer driving unbounded allocation, and every call site must state
	 * it explicitly. Exceeding it is fatal.
	 */
	maxBufferSize: number;

	/** Initial receive arena size. Defaults to 8 KiB. */
	initialCapacity?: number;
};

export type FrameLinkSwapTransportOptions = {
	/** Retain undecoded bytes across the transport swap. */
	keepResidue?: boolean;
};

/**
 * Turns a byte {@link Transport} into a stream of typed values, and typed values
 * back into bytes.
 *
 * Owns everything that is protocol-independent: the decode loop (via
 * {@link DecodeDriver}), streamed payloads (via `BodyReader`), read and write
 * backpressure, silence timeouts, transport and codec swapping, and lifecycle.
 * Protocol knowledge lives entirely in the injected {@link Codec}, and
 * correlation lives entirely above in the session.
 *
 * Message-mode datagrams bypass the decode loop entirely — a datagram is always
 * exactly one complete value with no state carried to the next one, which
 * `DecodeDriver` (built for accumulation across calls) has nothing to offer.
 *
 * @typeParam In - Decoded (inbound) value type.
 * @typeParam Out - Encoded (outbound) value type. Separate from `In` because
 *   most non-trivial protocols are asymmetric.
 */
export class FrameLink<In, Out = In>
	extends EventDispatcherMapBase<FrameLinkEvents>
	implements IEventDispatcherMap<FrameLinkEvents>
{
	private transport: Transport;
	private codec: Codec<In, Out>;
	private readonly sink: FrameSink<In>;
	private readonly driver: DecodeDriver<In, Uint8Array, Uint8Array, unknown>;

	private silenceTimer: Timer | null = null;
	private body: BodyReader | null = null;
	private ended = false;
	private closed = false;

	constructor(options: FrameLinkOptions<In, Out>) {
		super();
		this.transport = options.transport;
		this.codec = options.codec;
		this.sink = options.sink;

		const sink: DecodeSink<In, unknown> = {
			onDecoded: (value, _consumed, extra) =>
				this.handleDecoded(value, extra.body),
			onError: (error) => this.dispatch("protocolError", [error]),
			onFatal: (error) => this.fail(error),
			onIncomplete: () => {
				/* Wait for more bytes. */
			},
			onPending: () => {
				/* The idle timer is armed by the schedule callback below. */
			},
			onTruncated: () =>
				this.fail(new Error("Connection ended with an incomplete value")),
		};

		this.driver = new DecodeDriver({
			decoder: this.codec,
			buffer: new ByteAccumulator(options.maxBufferSize, {
				initialCapacity: options.initialCapacity,
			}),
			sink,
			idle: {
				kind: "timer",
				schedule: (delayMs, run) => {
					this.silenceTimer = new Timer(run, delayMs);
					this.silenceTimer.start();
					return () => {
						this.silenceTimer?.cancel();
						this.silenceTimer = null;
					};
				},
			},
		});

		this.transport.start(this.buildHandlers());
	}

	/** Bytes received but not yet decoded. */
	get buffered(): number {
		return this.driver.buffered;
	}

	/**
	 * Encode and send one value.
	 *
	 * @param value The value to transmit.
	 * @param signal Cancels the wait for transport capacity. Bytes already
	 *   accepted by the transport cannot be unsent.
	 * @returns Resolves once the transport has accepted the bytes.
	 */
	send(value: Out, signal?: AbortSignal): Promise<void> {
		return this.sendRaw(this.codec.encode(value), signal);
	}

	/**
	 * Send raw bytes, bypassing the encoder.
	 *
	 * Required by protocols that interleave opaque payloads with framed commands,
	 * such as an SMTP `DATA` body.
	 *
	 * @param data One or more buffers, written as a single vectored write.
	 * @param signal Cancels the wait for transport capacity.
	 * @returns Resolves once the transport has accepted the bytes.
	 */
	sendRaw(
		data: Uint8Array | readonly Uint8Array[],
		signal?: AbortSignal,
	): Promise<void> {
		return this.transport.write(
			ArrayBuffer.isView(data) ? [data] : data,
			signal,
		);
	}

	/** Suspend value delivery by pausing the transport. */
	pause(): void {
		this.transport.pause();
	}

	/** Resume value delivery suspended by {@link pause}. */
	resume(): void {
		this.transport.resume();
	}

	/**
	 * Discard undecoded bytes, decoder state and any silence timer.
	 *
	 * Safe to call from inside a {@link FrameSink} invocation: `DecodeDriver`
	 * detects the reentrant call and stops rather than continuing over a buffer
	 * that no longer exists.
	 */
	reset(): void {
		this.driver.clear();
		this.discardBody();
	}

	/**
	 * Remove and return the undecoded bytes without discarding them.
	 *
	 * The residue after a protocol switch belongs to the next protocol: an HTTP
	 * `Upgrade` response may be followed immediately by WebSocket bytes in the
	 * same segment. Discarding them silently corrupts the upgraded connection.
	 *
	 * @returns A copy of the bytes received but not yet decoded.
	 */
	takeResidue(): Uint8Array {
		return this.driver.takeResidue();
	}

	/**
	 * Replace the codec, for example after an RTMP handshake completes or an SMTP
	 * session negotiates a new mode.
	 *
	 * @param codec The codec to decode and encode with from now on.
	 */
	swapCodec(codec: Codec<In, Out>): void {
		this.codec = codec;
		this.driver.swapDecoder(codec);
	}

	/**
	 * Replace the transport, carrying over any undecoded bytes.
	 *
	 * This is the STARTTLS primitive: the plaintext transport is detached (not
	 * destroyed, since the TLS transport wraps the same socket) and framing
	 * continues over the new one.
	 *
	 * @param transport The transport to read from and write to from now on.
	 * @param options `keepResidue` retains undecoded bytes across the swap. Leave
	 *   it `false` for security-sensitive switches such as STARTTLS, where
	 *   buffered plaintext is a command-injection vector.
	 */
	swapTransport(
		transport: Transport,
		options?: FrameLinkSwapTransportOptions,
	): void {
		this.discardBody();

		if (options?.keepResidue) {
			this.driver.resync();
		} else {
			this.driver.discardBuffer();
		}

		this.transport.stop();
		this.transport = transport;
		this.transport.start(this.buildHandlers());
	}

	/**
	 * Half-close the outbound direction and flush pending writes.
	 *
	 * @returns Resolves once the transport has flushed.
	 */
	end(): Promise<void> {
		return this.transport.end();
	}

	/**
	 * Tear down the link and its transport.
	 *
	 * @param error Optional cause reported to listeners.
	 */
	destroy(error?: unknown): void {
		if (this.closed) {
			return;
		}

		error ??= new FrameLinkDestroyedError();

		this.discardBody(error);
		this.transport.destroy(error);
		this.transport.stop();
	}

	/** Destroys the link, so it can be used with `await using`. */
	async [Symbol.asyncDispose](): Promise<void> {
		this.destroy();
	}

	private buildHandlers(): TransportHandlers {
		return {
			data: (chunk) => this.handleData(chunk),
			end: () => this.handleEnd(),
			close: () => this.handleClose(),
			error: (error) =>
				this.fail(new FrameLinkTransportError({ cause: error })),
		};
	}

	private handleData(chunk: Uint8Array): void {
		if (this.closed) {
			return;
		}

		// Body bytes bypass the decode loop entirely; this is what keeps large
		// payloads from ever being accumulated or copied.
		if (this.body) {
			const consumed = this.body.feed(chunk);
			if (consumed === chunk.length) {
				return;
			}
			chunk = chunk.subarray(consumed);
		}

		if (this.transport.mode === "message") {
			this.decodeMessage(chunk);
			return;
		}

		try {
			this.driver.write(chunk);
		} catch (error) {
			this.fail(error);
		}
	}

	private decodeMessage(chunk: Uint8Array): void {
		const context: DecodeContext = {
			timedOut: false,
			atEof: this.ended,
			atMessageBoundary: true,
		};

		const result = this.codec.decode(chunk, context);
		switch (result.status) {
			case "decoded": {
				const seed = chunk.subarray(result.consumed);
				this.handleDecoded(result.value, result.body, seed);
				break;
			}
			case "error":
				this.dispatch("protocolError", [result.error]);
				break;
			case "fatal":
				this.fail(result.error);
				break;
			default:
				this.fail(new Error("Datagram did not contain a complete value"));
				break;
		}
	}

	/**
	 * Emits one decoded value and, when the codec declared one, starts its body
	 * stream.
	 *
	 * @param seed Message-mode only: the bytes of the same datagram that follow
	 *   the value. `undefined` in stream mode, where any already-buffered bytes
	 *   are pulled from the driver instead (see
	 *   {@link DecodeDriver["takeResidue"]}).
	 */
	private handleDecoded(
		value: In,
		body: BodySpec | undefined,
		seed?: Uint8Array,
	): void {
		if (!body) {
			this.sink(value);
			return;
		}

		const stream = this.startBody(body);
		this.sink(value, stream);

		if (seed !== undefined) {
			// Message mode: the body can only ever be as long as what's left in
			// this one datagram, so it always finishes here regardless of mode.
			if (seed.length > 0) {
				this.body!.feed(seed);
			}
			this.body!.finish();
			return;
		}

		// Stream mode: anything already buffered beyond this value's own bytes
		// belongs to the body, not the next decode attempt.
		const pending = this.driver.takeResidue();
		if (pending.length > 0) {
			const taken = this.body!.feed(pending);
			if (taken < pending.length) {
				this.driver.write(pending.subarray(taken));
			}
		} else if (this.ended) {
			this.body!.finishAtEof();
		}
	}

	private startBody(spec: BodySpec): ReadableStream<Uint8Array> {
		const reader = new BodyReader(spec, {
			onBackpressure: (paused) => {
				if (paused) {
					this.transport.pause();
				} else {
					this.transport.resume();
				}
			},
		});
		this.body = reader;
		return reader.stream;
	}

	private discardBody(error?: unknown): void {
		this.body?.discard(error);
		this.body = null;
	}

	private handleEnd(): void {
		this.ended = true;
		if (this.body) {
			this.body.finishAtEof();
		}
		this.driver.close();
		this.dispatch("end", []);
	}

	private handleClose(): void {
		if (this.closed) {
			return;
		}
		this.closed = true;
		this.discardBody(new Error("Connection closed"));
		this.transport.stop();
		this.dispatch("close", []);
	}

	private fail(error: unknown): void {
		if (this.closed) {
			return;
		}
		this.closed = true;
		this.discardBody(error);
		this.transport.destroy(error);
		this.transport.stop();
		this.dispatch("error", [error]);
		this.dispatch("close", []);
	}
}
