import { type EqualityComparisonStrategy } from "@ac-kit/core";
import { EnhancedSet } from "@ac-kit/data";

/**
 * Checks whether `a` and `b` share no elements.
 *
 * Time complexity: O(|a| + |b|) under the default `"sameValueZero"`.
 *
 * @param a The first iterable.
 * @param b The second iterable.
 * @param comparisonStrategy The equality comparison strategy to use.
 * @returns `true` if `a` and `b` have no elements in common.
 */
export function isDisjointFrom<T>(
	a: Iterable<T>,
	b: Iterable<T>,
	comparisonStrategy: EqualityComparisonStrategy<T, T> = "sameValueZero",
): boolean {
	if (comparisonStrategy === "sameValueZero") {
		return new Set(a).isDisjointFrom(new Set(b));
	}

	const sa = new EnhancedSet<T>(a, { comparisonStrategy });
	const sb = new EnhancedSet<T>(b, { comparisonStrategy });

	return sa.isDisjointFrom(sb);
}
