import { EqualityComparisonStrategy, isEqual } from "../object/is-equal.js";

export const FIND_INDEX_DEFAULT_COMPARISON_STRATEGY: EqualityComparisonStrategy =
	"strict";

/**
 * Finds the index of an item in an array using a specified equality comparison
 * strategy.
 *
 * Note: "strict" comparison uses the built-in `Array.prototype.indexOf` method,
 * which is faster than a custom comparison function. For other strategies, a
 * linear search (O(n)) is performed. On a sorted array, consider using a binary
 * search for better performance.
 *
 * @param array The array to search in.
 * @param item The item to find.
 * @param comparisonStrategy The equality comparison strategy to use (default is
 *   "strict").
 * @returns The index of the item in the array, or -1 if not found.
 */
export function findIndex<T>(
	array: T[],
	item: T,
	comparisonStrategy: EqualityComparisonStrategy<
		T,
		T
	> = FIND_INDEX_DEFAULT_COMPARISON_STRATEGY,
): number {
	if (comparisonStrategy === "strict") {
		return array.indexOf(item);
	}

	for (let index = 0; index < array.length; index++) {
		if (isEqual(array[index]!, item, comparisonStrategy)) {
			return index;
		}
	}
	return -1;
}
