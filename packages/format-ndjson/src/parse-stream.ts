import { BYTES_PER_MIB } from "@ac-kit/core";
import { DecodeStream, TextDecodeBuffer } from "@ac-kit/format-core";
import type { JsonValue } from "type-fest";

import { NdjsonLineDecoder } from "./ndjson-line-decoder.js";

export type NdjsonParseStreamOptions = {
	/**
	 * Hard ceiling on undecoded retained text, in UTF-16 code units.
	 *
	 * Distinct from {@link maxLineLength}: that is a grammar limit the decoder
	 * reports as a recoverable error, this is the abuse backstop on how much a
	 * producer may hand over before any of it is decodable. A single write larger
	 * than this throws `BufferOverflowError`. Defaults to 1 MiB.
	 */
	maxBufferSize?: number;

	/**
	 * Called for a malformed or over-long line instead of erroring the stream.
	 *
	 * Web Streams have no non-fatal error channel, so recovery has to be a policy
	 * the caller supplies. Omit it and the first bad line ends the stream.
	 */
	onError?: (error: unknown) => void;
};

/**
 * Parses a newline-delimited JSON byte stream, emitting one {@link JsonValue}
 * per non-empty line.
 *
 * A malformed or over-long line errors the stream unless
 * {@link NdjsonParseStreamOptions.onError} is supplied.
 */
export class NdjsonParseStream extends DecodeStream<
	JsonValue,
	string,
	Uint8Array
> {
	/**
	 * Maximum byte length of a single line.
	 *
	 * This is a required guard against unbounded memory growth — there is no safe
	 * default for all use cases.
	 */
	constructor(maxLineLength: number, options?: NdjsonParseStreamOptions) {
		super(new NdjsonLineDecoder(maxLineLength), {
			buffer: new TextDecodeBuffer(options?.maxBufferSize ?? BYTES_PER_MIB),
			...(options?.onError ? { onError: options.onError } : {}),
		});
	}
}
