import type { Jsonify } from "type-fest";
import {
	type JsonMakeAllReplacersFunctionOptions,
	jsonMakeAllReplacersFunction,
} from "./replacers/all-replacers.js";

export type JsonSerializeOptions = JsonMakeAllReplacersFunctionOptions;

/**
 * Serialize a value to a JSON-compatible format.
 *
 * The function follows the same rules as `JSON.stringify`, but instead of
 * returning a string, it returns the serialized value directly.
 *
 * @param value The value to serialize.
 * @param replacer A function that transforms the result
 * @param options Options to customize the behavior of the serialization, such as handling circular references.
 * @returns A JSON representation of the value, or `undefined` if a "pure" value has been passed in argument.
 */
export function jsonSerialize<T>(
	value: T,
	replacer?: JsonReplacer,
	options?: JsonSerializeOptions,
): Jsonify<T> | undefined {
	const allReplacers = jsonMakeAllReplacersFunction(replacer, options);

	const jsonString = JSON.stringify(value, allReplacers);

	if (jsonString === undefined) {
		return;
	}

	return JSON.parse(jsonString) as Jsonify<T>;
}
