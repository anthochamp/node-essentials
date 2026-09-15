import type { Codec } from "../codec.js";
import {
	createDelimitedDecoder,
	type DelimitedDecoderOptions,
} from "./delimited-decoder.js";
import { createDelimitedEncoder } from "./delimited-encoder.js";

export type DelimitedCodecOptions = DelimitedDecoderOptions;

/**
 * Creates a generic delimiter-terminated codec for binary payloads.
 *
 * Use when values end in a fixed byte sequence that is not a newline, such as a
 * NUL-terminated record stream. Use {@link createDelimitedDecoder} or
 * {@link createDelimitedEncoder} directly where only one direction is needed.
 *
 * @param delimiter - The byte sequence that terminates each value. Must not be
 *   empty.
 * @param options - See {@link DelimitedCodecOptions}.
 */
export function createDelimitedCodec(
	delimiter: Uint8Array,
	options?: DelimitedCodecOptions,
): Codec<Uint8Array> {
	const decoder = createDelimitedDecoder(delimiter, options);
	const encoder = createDelimitedEncoder(delimiter);

	return {
		decode: (view, context) => decoder.decode(view, context),
		encode: (value) => encoder.encode(value),
	};
}
