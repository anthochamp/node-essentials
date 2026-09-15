import json5 from "json5";
import type { JsonValue } from "type-fest";

export type Json5ParseOptions = {
	reviver?: Parameters<typeof JSON.parse>[1];
};

/** Parses a JSON5 string into a {@link JsonValue}. */
export function parseJson5(
	source: string,
	options?: Json5ParseOptions,
): JsonValue {
	try {
		return json5.parse<JsonValue>(source, options?.reviver);
	} catch (error) {
		throw new Error("parse JSON5", { cause: error });
	}
}
