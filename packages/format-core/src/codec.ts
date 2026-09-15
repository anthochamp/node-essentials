import type { Decoder } from "./decoder.js";
import type { Encoder } from "./encoder.js";

/**
 * Bidirectional codec.
 *
 * `In` and `Out` are separate so asymmetric protocols stay type-safe: an HTTP
 * client decodes responses and encodes requests, and a send path must not
 * accept a response type.
 *
 * @template In - The decoded value type.
 * @template Out - The value type to encode.
 * @template View - Backing representation of the accumulated input/output.
 */
export interface Codec<In, Out = In, View = Uint8Array>
	extends Decoder<In, View>, Encoder<Out, View> {}
