import { UnimplementedError } from "../error/unimplemented-error.js";
import type { Predicate } from "../function/types.js";

/**
 * A type representing well-known equality comparison strategies for item comparison.
 *
 * It can be one of the following string literals:
 * - `"loose"`: Uses loose equality (`==`) for comparison.
 * - `"strict"`: Uses strict equality (`===`) for comparison.
 * - `"sameValue"`: Uses `Object.is()` for comparison.
 * - `"sameValueZero"`: Uses `Object.is()` but treats `NaN` as equal to `NaN`.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness
 */
export type IsEqualWellKnownStrategy =
	| "loose"
	| "strict"
	| "sameValue"
	| "sameValueZero";

/**
 * Compare two values for equality using the specified strategy or a custom predicate.
 *
 * @param a The first value to compare
 * @param b The second value to compare
 * @param strategy The equality comparison strategy to use or a custom predicate function (default is "strict")
 * @returns True if the values are equal, false otherwise
 */
export function isEqual(
	a: unknown,
	b: unknown,
	strategy: IsEqualWellKnownStrategy | Predicate<[unknown, unknown]> = "strict",
): boolean {
	switch (strategy) {
		case "loose":
			// biome-ignore lint/suspicious/noDoubleEquals: intended
			return a == b;
		case "strict":
			return a === b;
		case "sameValue":
			return Object.is(a, b);
		case "sameValueZero":
			// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness#same-value-zero_equality
			if (typeof a === "number" && typeof b === "number") {
				// a and b are equal (may be -0 and 0) or they are both NaN
				// biome-ignore lint/suspicious/noSelfCompare: intended
				return a === b || (a !== a && b !== b);
			}
			return a === b;
		default:
			if (typeof strategy === "function") {
				return strategy(a, b);
			}

			throw new UnimplementedError(`strategy ${strategy}`);
	}
}
