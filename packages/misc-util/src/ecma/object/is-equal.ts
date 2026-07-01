import type { Predicate } from "../function/types.js";

/**
 * A type representing well-known equality comparison strategies for item comparison.
 *
 * It can be one of the following string literals:
 *
 * - `"loose"`: Uses loose equality (`==`) for comparison. Double equals (==)
 * 	will perform a type conversion when comparing two things, and will handle
 * 	NaN, -0, and +0 specially to conform to IEEE 754 (so NaN != NaN, and -0 == +0)
 *
 * - `"strict"`: Uses strict equality (`===`) for comparison. Triple equals (===)
 * 	will do the same comparison as double equals (including the special handling
 * 	for NaN, -0, and +0) but without type conversion; if the types differ, false
 * 	is returned.
 *
 * - `"sameValue"`: Uses `Object.is()` for comparison. Object.is() does no type
 * 	conversion and no special handling for NaN, -0, and +0 (giving it the same
 * 	behavior as === except on those special numeric values).
 *
 * - `"sameValueZero"`: Uses `Object.is()` but +0 and -0 are considered equal.
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
export function isEqual<A, B>(
	a: A,
	b: B,
	strategy: IsEqualWellKnownStrategy | Predicate<[A, B]> = "strict",
): boolean {
	switch (strategy) {
		case "loose":
			// @ts-expect-error -- intended
			// biome-ignore lint/suspicious/noDoubleEquals: intended
			return a == b;
		case "strict":
			// @ts-expect-error -- intended
			return a === b;
		case "sameValue":
			return Object.is(a, b);
		case "sameValueZero":
			// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness#same-value-zero_equality
			if (typeof a === "number" && typeof b === "number") {
				// a and b are equal (may be -0 and 0) or they are both NaN
				// @ts-expect-error -- intended
				// biome-ignore lint/suspicious/noSelfCompare: intended
				return a === b || (a !== a && b !== b);
			}
			// @ts-expect-error -- intended
			return a === b;
		default:
			return strategy(a, b);
	}
}
