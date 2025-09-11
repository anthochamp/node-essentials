import { jsonSerializeError } from "./json-serialize-error.js";
import { makeJsonReplacerFunction } from "./make-json-replacer-function.js";

/**
 * Stringifies a value to JSON, handling circular references, Error objects, and BigInt values.
 *
 * @param value The value to stringify.
 * @param replacer A function that alters the behavior of the stringification process, or
 * an array of String and Number objects that serve as a whitelist for selecting/filtering
 * the properties of the value object to be included in the JSON string. If this value is null
 * or not provided, all properties of the object are included in the resulting JSON string.
 * @param space The number of spaces to use for indentation or a string to use as whitespace.
 * @returns A JSON string representation of the value, or undefined if the value cannot be stringified.
 */
export function jsonStringifySafe(
	value: unknown,
	replacer?: JsonReplacer,
	space?: string | number,
): string | undefined {
	const visited = new WeakSet();

	return JSON.stringify(
		value,
		makeJsonReplacerFunction((_k: string, v: unknown): unknown => {
			// Handle circular references
			if (v && typeof v === "object") {
				if (visited.has(v as object)) {
					return "[Circular]";
				}
				visited.add(v as object);
			}

			// Handle Error objects
			if (v instanceof Error) {
				return jsonSerializeError(v);
			}

			// Handle BigInt values
			if (v instanceof BigInt || typeof v === "bigint") {
				const num = v.valueOf();

				if (
					num > BigInt(Number.MIN_SAFE_INTEGER) &&
					num < BigInt(Number.MAX_SAFE_INTEGER)
				) {
					return Number(num);
				}

				return num.toString();
			}

			return v;
		}, replacer),
		space,
	);
}
