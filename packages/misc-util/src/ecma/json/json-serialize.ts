import type { Jsonify } from "type-fest";

/**
 * Serialize a value to a JSON-compatible format.
 *
 * The function follows the same rules as `JSON.stringify`, but instead of
 * returning a string, it returns the serialized value directly.
 *
 *
 * @param value The value to serialize.
 * @param replacer A function that transforms the result
 * @returns A JSON representation of the value, or `undefined` if a "pure" value has been passed in argument.
 */
export function jsonSerialize<T>(
	value: T,
	replacer?: JsonReplacer,
): Jsonify<T> | undefined {
	const jsonString = JSON.stringify(value, replacer);

	if (jsonString === undefined) {
		return;
	}

	return JSON.parse(jsonString) as Jsonify<T>;
}
