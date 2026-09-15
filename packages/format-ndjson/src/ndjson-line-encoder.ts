import { encodeText, JsonReplacer } from "@ac-kit/core";
import type { Encoder } from "@ac-kit/format-core";
import type { JsonValue } from "type-fest";

export type NdjsonLineEncoderOptions = {
	replacer?: JsonReplacer;
	space?: string | number;
};

/**
 * Serializes one value to its LF-terminated NDJSON line.
 *
 * The single implementation of the NDJSON write grammar: `printNdjson` and
 * {@link createNdjsonLineEncoder} are both built on this.
 */
export function printNdjsonLine(
	value: JsonValue,
	options?: NdjsonLineEncoderOptions,
): string {
	return `${JSON.stringify(value, options?.replacer, options?.space)}\n`;
}

/** Creates the NDJSON write half, emitting one UTF-8 line per value. */
export function createNdjsonLineEncoder(
	options?: NdjsonLineEncoderOptions,
): Encoder<JsonValue> {
	return {
		encode: (value) => encodeText(printNdjsonLine(value, options), "utf-8"),
	};
}
