import type { Predicate } from "../types/callable.js";

/**
 * A type representing well-known equality comparison strategies for item
 * comparison.
 *
 * It can be one of the following string literals:
 *
 * - `"loose"`: Uses loose equality (`==`) for comparison. Double equals (==) will
 *   perform a type conversion when comparing two things, and will handle NaN,
 *   -0, and +0 specially to conform to IEEE 754 (so NaN != NaN, and -0 == +0)
 * - `"strict"`: Uses strict equality (`===`) for comparison. Triple equals (===)
 *   will do the same comparison as double equals (including the special
 *   handling for NaN, -0, and +0) but without type conversion; if the types
 *   differ, false is returned.
 * - `"sameValue"`: Uses `Object.is()` for comparison. Object.is() does no type
 *   conversion and no special handling for NaN, -0, and +0 (giving it the same
 *   behavior as === except on those special numeric values).
 * - `"sameValueZero"`: Uses `Object.is()` but +0 and -0 are considered equal.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness
 */
export type WellKnownEqualityComparisonStrategy =
	| "loose"
	| "strict"
	| "sameValue"
	| "sameValueZero";

/**
 * A type representing a function that compares two values for equality.
 *
 * The function should return `true` if the values are considered equal, and
 * `false` otherwise.
 */
export type EqualityComparator<A, B> = Predicate<[A, B]>;

/**
 * A type representing an equality comparison strategy, which can be either a
 * well-known strategy or a custom predicate function.
 */
export type EqualityComparisonStrategy<A = unknown, B = unknown> =
	| WellKnownEqualityComparisonStrategy
	| EqualityComparator<A, B>;

/**
 * Compare two values for equality using the specified strategy or a custom
 * predicate.
 *
 * @param a The first value to compare
 * @param b The second value to compare
 * @param comparisonStrategy The strategy to use for comparison, which can be a
 *   well-known strategy or a custom predicate function. Defaults to
 *   `"strict"`.
 * @returns True if the values are equal, false otherwise
 */
export function isEqual<A, B>(
	a: A,
	b: B,
	comparisonStrategy: EqualityComparisonStrategy<A, B> = "strict",
): boolean {
	if (typeof comparisonStrategy === "function") {
		return comparisonStrategy(a, b);
	}

	return resolveEqualityComparator(comparisonStrategy)(a, b);
}

/**
 * This is the same as `==`.
 *
 * Double equals (==) will perform a type conversion when comparing two things,
 * and will handle NaN, -0, and +0 specially to conform to IEEE 754 (so NaN !=
 * NaN, and -0 == +0).
 */
export function isLooseEqual(a: unknown, b: unknown): boolean {
	return a == b;
}

/**
 * This is the same as `===`.
 *
 * Triple equals (===) will do the same comparison as double equals (==) but
 * without type conversion; if the types differ, false is returned. It also
 * handles NaN, -0, and +0 specially to conform to IEEE 754 (so NaN != NaN, and
 * -0 == +0).
 */
export function isStrictEqual(a: unknown, b: unknown): boolean {
	return a === b;
}

/**
 * This is the same as `Object.is()`.
 *
 * Object.is() determines whether two values are the same value. Two values are
 * the same if one of the following holds:
 *
 * - Both values are undefined.
 * - Both values are null.
 * - Both values are true or both values are false.
 * - Both values are strings of the same length with the same characters in the
 *   same order.
 * - Both values are the same object (meaning both values reference the same
 *   object in memory).
 * - Both values are numbers and either both are +0, both are -0, both are NaN, or
 *   both are non-zero and have the same value.
 */
export function isSameValueEqual(a: unknown, b: unknown): boolean {
	return Object.is(a, b);
}

/**
 * This is the same as `Object.is()` except that +0 and -0 are considered equal.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness#same-value-zero_equality
 */
export function isSameValueZeroEqual(a: unknown, b: unknown): boolean {
	if (typeof a === "number" && typeof b === "number") {
		// a and b are equal (may be -0 and 0) or they are both NaN
		return a === b || (a !== a && b !== b);
	}
	return a === b;
}

/**
 * Resolves an {@link EqualityComparisonStrategy} to the comparator it names,
 * once, so a per-element caller does not re-dispatch the string on every
 * comparison.
 *
 * {@link isEqual} re-reads `comparisonStrategy` and re-enters its `switch` per
 * call, which is fine for a one-shot comparison and wrong inside a loop that
 * runs once per element. Resolve at construction (or at the top of the
 * operation) and call the result.
 *
 * @example
 * 	```ts
 *      const equals = resolveEqualityComparator(options.comparisonStrategy);
 *      for (let i = 0; i < items.length; i++) {
 *              if (equals(items[i]!, needle)) return i;
 *      }
 *      ```;
 *
 * @param comparisonStrategy The strategy to resolve. Defaults to `"strict"`.
 * @returns The comparator. A custom predicate is returned as-is; a well-known
 *   strategy resolves to a shared function, never a fresh closure.
 */
export function resolveEqualityComparator<A, B>(
	comparisonStrategy: EqualityComparisonStrategy<A, B> = "strict",
): EqualityComparator<A, B> {
	if (typeof comparisonStrategy === "function") {
		return comparisonStrategy;
	}

	switch (comparisonStrategy) {
		case "loose":
			return isLooseEqual;
		case "strict":
			return isStrictEqual;
		case "sameValue":
			return isSameValueEqual;
		case "sameValueZero":
			return isSameValueZeroEqual;
	}
}
