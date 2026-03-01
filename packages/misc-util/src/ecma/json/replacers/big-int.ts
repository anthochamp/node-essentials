import { jsonMakeReplacerFunction } from "../make-replacer-function.js";

/**
 * Create a JSON replacer function that converts BigInt values to either numbers
 * (if within safe range) or strings.
 *
 * This function can be used as a base replacer to ensure that BigInt values are
 * properly handled during JSON serialization, and can be combined with a user-defined
 * replacer for additional customization.
 *
 * @param replacer An optional user-defined replacer (function or property list) to apply after the BigInt replacer.
 * @returns A JSON replacer function that handles BigInt values and applies the user-defined replacer if provided.
 */
export function jsonMakeBigIntReplacerFunction(
	replacer?: JsonReplacer,
): JsonReplacerFunction {
	return jsonMakeReplacerFunction((_key, value) => {
		if (value instanceof BigInt || typeof value === "bigint") {
			const num = value.valueOf();

			if (
				num >= BigInt(Number.MIN_SAFE_INTEGER) &&
				num <= BigInt(Number.MAX_SAFE_INTEGER)
			) {
				return Number(num);
			}

			return num.toString();
		}

		return value;
	}, replacer);
}
