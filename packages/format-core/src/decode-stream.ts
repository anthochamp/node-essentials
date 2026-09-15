import type { DecodeBuffer } from "./decode-buffer.js";
import { DecodeDriver } from "./decode-driver.js";
import type { DecodeSink } from "./decode-sink.js";
import type { Decoder } from "./decoder.js";

/** Options for {@link DecodeStream}. */
export interface DecodeStreamOptions<T, View, Chunk = View, W = never> {
	/**
	 * Accumulates undecoded input between `transform()` calls.
	 *
	 * Supplied rather than constructed here because the buffer is what pins the
	 * view type: `ByteAccumulator` for a byte decoder, {@link TextBuffer} for a
	 * text one, `ChunkListBuffer` for a cursor one. Each carries its own
	 * mandatory retention ceiling, which is the constraint `net-core`'s
	 * `FrameLink` documents.
	 */
	readonly buffer: DecodeBuffer<View, Chunk>;

	/**
	 * Called for a recoverable violation instead of ending the stream. Web
	 * Streams have no non-fatal error channel, so recovery is a policy the caller
	 * supplies. Omit it and the first recoverable error ends the stream.
	 */
	readonly onError?: (error: unknown) => void;

	/** Called alongside a decoded value that carries best-effort diagnostics. */
	readonly onWarnings?: (warnings: readonly W[], value: T) => void;
}

/**
 * Chunks in, decoded values out — a {@link Decoder} driven by a
 * {@link DecodeDriver} and exposed as a `TransformStream`, for any incremental,
 * non-live source (a Node `Readable`, a Web `ReadableStream`, a file being read
 * in chunks).
 *
 * Unlike `net-core`'s `FrameLink`, there is no transport to pause: backpressure
 * comes from the Web Streams queue itself. A decoder that returns `pending` is
 * supported — a `TransformStreamDefaultController` stays valid after
 * `transform()` returns, so enqueueing from the `setTimeout` callback below is
 * legal — and on `flush()`, `DecodeDriver.close()` resolves any outstanding
 * `pending` immediately rather than waiting out the full silence window.
 */
export class DecodeStream<
	T,
	View = Uint8Array,
	Chunk = View,
	W = never,
> extends TransformStream<Chunk, T> {
	constructor(
		decoder: Decoder<T, View, W>,
		options: DecodeStreamOptions<T, View, Chunk, W>,
	) {
		let driver!: DecodeDriver<T, View, Chunk, W>;

		super({
			start(controller) {
				const sink: DecodeSink<T, W> = {
					onDecoded(value, _consumed, extra) {
						controller.enqueue(value);
						if (extra.warnings) {
							options.onWarnings?.(extra.warnings, value);
						}
					},
					onError(error) {
						if (options.onError) {
							options.onError(error);
						} else {
							controller.error(error);
						}
					},
					onFatal(error) {
						controller.error(error);
					},
					onIncomplete() {
						// Wait for the next transform() call.
					},
					onPending() {
						// The timer is armed by DecodeDriver itself; nothing to do here.
					},
					onTruncated() {
						controller.error(new Error("Input ended with an incomplete value"));
					},
				};

				driver = new DecodeDriver({
					decoder,
					buffer: options.buffer,
					sink,
					idle: {
						kind: "timer",
						schedule(delayMs, run) {
							const id = setTimeout(run, delayMs);
							return () => clearTimeout(id);
						},
					},
				});
			},
			transform(chunk) {
				driver.write(chunk);
			},
			flush() {
				driver.close();
			},
		});
	}
}
