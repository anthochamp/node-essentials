import { type EqualityComparisonStrategy } from "@ac-kit/core";
import { EnhancedSet } from "@ac-kit/data";

/**
 * Computes the union of any number of iterables.
 *
 * Time complexity: O(n) total across every source iterable, under the default
 * `"sameValueZero"`.
 *
 * @param iterables The iterables to union.
 * @param comparisonStrategy The equality comparison strategy to use.
 * @returns A `Set` containing every distinct element across all iterables.
 */
export function union<T>(
	iterables: readonly Iterable<T>[],
	comparisonStrategy: EqualityComparisonStrategy<T, T> = "sameValueZero",
): Iterable<T> {
	if (comparisonStrategy === "sameValueZero") {
		const result = new Set<T>();

		for (const iterable of iterables) {
			for (const item of iterable) {
				result.add(item);
			}
		}

		return result;
	}

	const result = new EnhancedSet<T>(undefined, { comparisonStrategy });

	for (const iterable of iterables) {
		result.addAll(iterable);
	}

	return result;
}
