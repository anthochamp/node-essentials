import type { DecodeContext } from "./decode-context.js";
import type { DecodeResult } from "./decode-result.js";

/**
 * Decodes values from a view over accumulated input.
 *
 * Decoders are injected into a driver ({@link DecodeDriver}, `decodeAll`,
 * `DecodeStream`, or `net/core`'s `FrameLink`), never subclassed from one: they
 * perform no I/O, hold no stream reference, and are testable against a plain
 * view. They may be stateful — HPACK tables, WebSocket fragment reassembly, and
 * RTMP chunk-header deltas all require it — in which case {@link reset} must
 * restore the initial state.
 *
 * @template T - The decoded value type.
 * @template View - Backing representation of the accumulated input. Defaults to
 *   a contiguous `Uint8Array`; the parameter exists so a non-contiguous backing
 *   (see `ByteCursor`) or a text backing (`string`, see `TextBuffer`) can be
 *   used without a breaking signature change.
 * @template W - The best-effort warning type, riding on a `decoded` result.
 */
export interface Decoder<T, View = Uint8Array, W = never> {
	/**
	 * Attempt to decode one value from the front of `view`.
	 *
	 * `view` is a window into the driver's buffer and is invalidated as soon as
	 * this call returns. Copy anything retained in the returned value.
	 */
	decode(view: View, context: DecodeContext): DecodeResult<T, W>;

	/** Discard accumulated decode state ahead of a protocol mode switch. */
	reset?(): void;
}
