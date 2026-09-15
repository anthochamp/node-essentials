import type { JsonValue } from "type-fest";

import type { DataValue } from "./ast.js";

/**
 * Converts a {@link DataValue} to a {@link JsonValue}, following the
 * non-normative advice in RFC 8949 §6.1.
 *
 * Only the blanket "ignore the tag number, convert the tag content" rule is
 * implemented for tags — the special-cased conversions for specific tags
 * (bignums via tags 2/3, the base64/base64url/base16 encoding hints via tags
 * 21-23) are not. `simple` values and `undefined`, and non-finite `float`
 * values, convert to the RFC's suggested substitute value, `null`.
 *
 * @throws {Error} If a map has a non-text-string key — JSON object keys must be
 *   strings, and silently stringifying a non-text key risks a collision the RFC
 *   itself calls out as a danger.
 */
export function dataValueToJson(value: DataValue): JsonValue {
	switch (value.kind) {
		case "int":
			return Number(value.value);
		case "float":
			return Number.isFinite(value.value) ? value.value : null;
		case "bytes":
			return value.value.toBase64({ alphabet: "base64url", omitPadding: true });
		case "text":
			return value.value;
		case "array":
			return value.items.map(dataValueToJson);
		case "map": {
			const result: Record<string, JsonValue> = {};
			for (const [key, entryValue] of value.entries) {
				if (key.kind !== "text") {
					throw new Error(
						`Cannot convert a CBOR map with a non-text-string key (${key.kind}) to a JSON object`,
					);
				}
				result[key.value] = dataValueToJson(entryValue);
			}
			return result;
		}
		case "tag":
			return dataValueToJson(value.value);
		case "bool":
			return value.value;
		case "null":
			return null;
		case "undefined":
			return null;
		case "simple":
			return null;
	}
}

/**
 * Converts a {@link JsonValue} to a {@link DataValue}, following the
 * non-normative advice in RFC 8949 §6.2.
 *
 * Integral numbers within `-(2^53-1)..2^53-1` (JSON's safe integer range)
 * become `int`; all other numbers become `float`.
 */
export function jsonToDataValue(value: JsonValue): DataValue {
	if (value === null) return { kind: "null" };
	if (typeof value === "boolean") return { kind: "bool", value };
	if (typeof value === "string") return { kind: "text", value };
	if (typeof value === "number") {
		if (Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
			return { kind: "int", value: BigInt(value) };
		}
		return { kind: "float", value };
	}
	if (Array.isArray(value)) {
		return { kind: "array", items: value.map(jsonToDataValue) };
	}
	return {
		kind: "map",
		entries: Object.entries(value).map(
			([key, entryValue]) =>
				[{ kind: "text", value: key }, jsonToDataValue(entryValue)] as const,
		),
	};
}
