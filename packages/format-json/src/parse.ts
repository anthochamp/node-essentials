import type { JsonValue } from "type-fest";

export type JsonParseOptions = {
	reviver?: Parameters<typeof JSON.parse>[1];
};

/** Parses a JSON string into a {@link JsonValue}. */
export function parseJson(
	source: string,
	options?: JsonParseOptions,
): JsonValue {
	try {
		return JSON.parse(source, options?.reviver) as JsonValue;
	} catch (error) {
		throw new Error("parse JSON", { cause: error });
	}
}
