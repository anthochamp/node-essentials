import { JsonReplacer, JsonStringifyResult } from "../types/json.js";
import {
	type JsonMakeAllReplacersFunctionOptions,
	jsonMakeAllReplacersFunction,
} from "./replacers/all-replacers.js";

export type JsonStringifySafeOptions = JsonMakeAllReplacersFunctionOptions;

/**
 * Stringify a value to a JSON string, handling circular references, Error
 * objects, and BigInt values gracefully.
 *
 * @param value The value to stringify.
 * @param replacer A function that alters the behavior of the stringification
 *   process, or an array of String and Number objects that serve as a whitelist
 *   for selecting/filtering the properties of the value object to be included
 *   in the JSON string. If this value is null or not provided, all properties
 *   of the object are included in the resulting JSON string.
 * @param space The number of spaces to use for indentation or a string to use
 *   as whitespace.
 * @param options Options to customize the behavior of the stringification, such
 *   as handling circular references.
 * @returns A JSON string representation of the value, or undefined if the value
 *   cannot be stringified.
 */
export function jsonStringifySafe<T>(
	value: T,
	replacer?: (string | number)[] | null,
	space?: string | number,
	options?: JsonStringifySafeOptions,
): JsonStringifyResult<T>;
export function jsonStringifySafe(
	value: unknown,
	replacer?: JsonReplacer,
	space?: string | number,
	options?: JsonStringifySafeOptions,
): string | undefined;
export function jsonStringifySafe(
	value: unknown,
	replacer?: JsonReplacer,
	space?: string | number,
	options?: JsonStringifySafeOptions,
): string | undefined {
	const allReplacers = jsonMakeAllReplacersFunction(replacer, options);

	return JSON.stringify(value, allReplacers, space);
}
