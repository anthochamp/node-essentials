/**
 * Encodes values to raw output units.
 *
 * Encoders are injected the same way {@link Decoder}s are: no I/O, no stream
 * reference, testable in isolation. They may be stateful — HPACK tables and
 * RTMP chunk-header deltas require it — in which case {@link reset} must restore
 * the initial state.
 *
 * @template Out - The value type to encode.
 * @template View - Backing representation of the encoded output. Defaults to a
 *   contiguous `Uint8Array`.
 */
export interface Encoder<Out, View = Uint8Array> {
	/**
	 * Encode a value into one or more output chunks.
	 *
	 * Returning an array defers concatenation to a vectored write, so a
	 * length-prefixed protocol can emit `[header, payload]` without copying the
	 * payload.
	 */
	encode(value: Out): View | readonly View[];

	/** Discard accumulated encode state ahead of a protocol mode switch. */
	reset?(): void;
}
