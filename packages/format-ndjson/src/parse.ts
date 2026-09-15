import { decodeAll, TextBuffer } from "@ac-kit/format-core";
import type { JsonValue } from "type-fest";

import { NdjsonLineDecoder } from "./ndjson-line-decoder.js";

/**
 * Parses all lines in an NDJSON string, skipping blank lines.
 *
 * A utility over {@link NdjsonLineDecoder}, not a second implementation of the
 * grammar: the source is already in memory, so it bounds the decoder by its own
 * length and reports the first bad line as a throw.
 */
export function parseNdjson(source: string): JsonValue[] {
	const length = Math.max(source.length, 1);
	const result = decodeAll<JsonValue, string, string, Error>(
		new NdjsonLineDecoder(length),
		source,
		{ buffer: new TextBuffer(length) },
	);

	const failure = result.fatal ?? result.errors[0];
	if (failure) {
		throw failure;
	}
	return result.items.map((item) => item.value);
}
