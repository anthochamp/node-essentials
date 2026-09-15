import { type EqualityComparisonStrategy } from "@ac-kit/core";
import { EnhancedSet } from "@ac-kit/data";

/**
 * Checks whether every element of `a` is also in `b`.
 *
 * Time complexity: O(|a| + |b|) under the default `"sameValueZero"`.
 *
 * @param a The candidate subset.
 * @param b The candidate superset.
 * @param comparisonStrategy The equality comparison strategy to use.
 * @returns `true` if `a` is a subset of `b` (every element of `a` is in `b`).
 */
export function isSubsetOf<T>(
	a: Iterable<T>,
	b: Iterable<T>,
	comparisonStrategy: EqualityComparisonStrategy<T, T> = "sameValueZero",
): boolean {
	if (comparisonStrategy === "sameValueZero") {
		return new Set(a).isSubsetOf(new Set(b));
	}

	const sa = new EnhancedSet<T>(a, { comparisonStrategy });
	const sb = new EnhancedSet<T>(b, { comparisonStrategy });

	return sa.isSubsetOf(sb);
}
