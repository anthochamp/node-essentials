import { type EqualityComparisonStrategy } from "@ac-kit/core";
import { EnhancedSet } from "@ac-kit/data";

/**
 * Checks whether every element of `b` is also in `a`.
 *
 * Time complexity: O(|a| + |b|) under the default `"sameValueZero"`.
 *
 * @param a The candidate superset.
 * @param b The candidate subset.
 * @param comparisonStrategy The equality comparison strategy to use.
 * @returns `true` if `a` is a superset of `b` (every element of `b` is in
 * `a`).
 */
export function isSupersetOf<T>(
	a: Iterable<T>,
	b: Iterable<T>,
	comparisonStrategy: EqualityComparisonStrategy<T, T> = "sameValueZero",
): boolean {
	if (comparisonStrategy === "sameValueZero") {
		return new Set(a).isSupersetOf(new Set(b));
	}

	const sa = new EnhancedSet<T>(a, { comparisonStrategy });
	const sb = new EnhancedSet<T>(b, { comparisonStrategy });

	return sa.isSupersetOf(sb);
}
