import type { JsonValue } from "type-fest";

import {
	type NdjsonLineEncoderOptions,
	printNdjsonLine,
} from "./ndjson-line-encoder.js";

/** Serializes an array of values to an NDJSON string. */
export function printNdjson(
	values: JsonValue[],
	options?: NdjsonLineEncoderOptions,
): string {
	return values.map((value) => printNdjsonLine(value, options)).join("");
}
