import { type EqualityComparisonStrategy } from "@ac-kit/core";
import { EnhancedSet } from "@ac-kit/data";

/**
 * Computes the elements in `a` that are not in `b`.
 *
 * Time complexity: O(|a| + |b|) under the default `"sameValueZero"`.
 *
 * @param a The iterable to subtract from.
 * @param b The iterable of elements to exclude.
 * @param comparisonStrategy The equality comparison strategy to use.
 * @returns A `Set` of the elements present in `a` but not in `b`.
 */
export function difference<T>(
	a: Iterable<T>,
	b: Iterable<T>,
	comparisonStrategy: EqualityComparisonStrategy<T, T> = "sameValueZero",
): Iterable<T> {
	if (comparisonStrategy === "sameValueZero") {
		return new Set(a).difference(new Set(b));
	}

	const sa = new EnhancedSet<T>(a, { comparisonStrategy });
	const sb = new EnhancedSet<T>(b, { comparisonStrategy });

	return sa.difference(sb);
}
