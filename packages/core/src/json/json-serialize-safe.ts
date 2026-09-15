import { JsonReplacer } from "../types/json.js";
import { jsonSerialize } from "./json-serialize.js";
import { JsonifySafe, JsonSerializeSafeResult } from "./jsonify-safe.js";
import {
	type JsonMakeAllReplacersFunctionOptions,
	jsonMakeAllReplacersFunction,
} from "./replacers/all-replacers.js";

export type JsonSerializeSafeOptions = JsonMakeAllReplacersFunctionOptions;

/**
 * Serialize a value to a JSON-compatible format.
 *
 * The function follows the same rules as `JSON.stringify`, but instead of
 * returning a string, it returns the serialized value directly.
 *
 * @param value The value to serialize.
 * @param replacer A function that transforms the result
 * @param options Options to customize the behavior of the serialization, such
 *   as handling circular references.
 * @returns A JSON representation of the value, or `undefined` if a "pure" value
 *   has been passed in argument.
 */
export function jsonSerializeSafe<T>(
	value: T,
	replacer?: (string | number)[] | null,
	options?: JsonSerializeSafeOptions,
): JsonSerializeSafeResult<T>;
export function jsonSerializeSafe<T>(
	value: T,
	replacer?: JsonReplacer,
	options?: JsonSerializeSafeOptions,
): JsonifySafe<T> | undefined;
export function jsonSerializeSafe<T>(
	value: T,
	replacer?: JsonReplacer,
	options?: JsonSerializeSafeOptions,
): JsonifySafe<T> | undefined {
	const allReplacers = jsonMakeAllReplacersFunction(replacer, options);

	return jsonSerialize(value, allReplacers) as JsonifySafe<T> | undefined;
}
