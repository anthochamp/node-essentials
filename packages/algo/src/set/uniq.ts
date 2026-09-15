import { DefinedValue, EqualityComparisonStrategy } from "@ac-kit/core";
import { EnhancedSet } from "@ac-kit/data";

/**
 * Yields each distinct value of an iterable, in first-occurrence order.
 *
 * Time complexity: O(n) under the default `"sameValueZero"` strategy. **Any
 * other strategy is O(n²)**.
 *
 * @param iterable The input iterable.
 * @param comparisonStrategy The equality comparison strategy to use (default is
 *   "sameValueZero").
 * @returns An iterator over the distinct values.
 */
export function* uniq<T extends DefinedValue>(
	iterable: Iterable<T>,
	comparisonStrategy: EqualityComparisonStrategy<T, T> = "sameValueZero",
): IterableIterator<T> {
	if (comparisonStrategy === "sameValueZero") {
		const seen = new Set<T>();

		for (const item of iterable) {
			// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness#same-value-zero_equality
			if (!seen.has(item)) {
				seen.add(item);
				yield item;
			}
		}
	} else {
		const seen = new EnhancedSet(undefined, { comparisonStrategy });

		for (const item of iterable) {
			if (!seen.has(item)) {
				seen.add(item);
				yield item;
			}
		}
	}
}
