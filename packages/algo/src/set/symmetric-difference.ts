import { type EqualityComparisonStrategy } from "@ac-kit/core";
import { EnhancedSet } from "@ac-kit/data";

/**
 * Computes the elements present in exactly one of `a` or `b`.
 *
 * Time complexity: O(|a| + |b|) under the default `"sameValueZero"`.
 *
 * @param a The first iterable.
 * @param b The second iterable.
 * @param comparisonStrategy The equality comparison strategy to use.
 * @returns A `Set` of the elements in `a` or `b` but not both.
 */
export function symmetricDifference<T>(
	a: Iterable<T>,
	b: Iterable<T>,
	comparisonStrategy: EqualityComparisonStrategy<T, T> = "sameValueZero",
): Iterable<T> {
	if (comparisonStrategy === "sameValueZero") {
		return new Set(a).symmetricDifference(new Set(b));
	}

	const sa = new EnhancedSet<T>(a, { comparisonStrategy });
	const sb = new EnhancedSet<T>(b, { comparisonStrategy });

	return sa.symmetricDifference(sb);
}
