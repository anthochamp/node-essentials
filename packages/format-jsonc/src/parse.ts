import jsonc, { type ParseError, type ParseOptions } from "jsonc-parser";
import type { JsonValue } from "type-fest";

import { JsoncParseError } from "./error.js";

export type JsoncParseOptions = ParseOptions;

/** Parses a JSONC string, stripping comments. */
export function parseJsonc(
	source: string,
	options: JsoncParseOptions = { allowTrailingComma: true },
): JsonValue {
	const errors: ParseError[] = [];
	const result = jsonc.parse(source, errors, options) as JsonValue;
	if (errors.length > 0) {
		throw new JsoncParseError(errors[0]!);
	}
	return result;
}
