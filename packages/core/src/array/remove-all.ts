import {
	type EqualityComparisonStrategy,
	isEqual,
} from "../object/is-equal.js";
import {
	FIND_INDEX_DEFAULT_COMPARISON_STRATEGY,
	findIndex,
} from "./find-index.js";

export const REMOVE_DEFAULT_COMPARISON_STRATEGY: EqualityComparisonStrategy =
	FIND_INDEX_DEFAULT_COMPARISON_STRATEGY;

/**
 * Removes all occurrences of an item from an array safely, ensuring that only
 * exact matches are removed.
 *
 * In asynchronous concurrent scenarios, this function ensures that the item
 * being removed is the same as the one found at the index, preventing
 * accidental removal of different items that may have been inserted or modified
 * in the array during the operation.
 *
 * @param array The array to remove items from.
 * @param item The item to remove.
 * @param comparisonStrategy The equality comparison strategy to use (default is
 *   "strict").
 * @returns An array of removed items.
 */
export function removeAll<T>(
	array: T[],
	item: T,
	comparisonStrategy: EqualityComparisonStrategy<
		T,
		T
	> = REMOVE_DEFAULT_COMPARISON_STRATEGY,
): T[] {
	const removedItems: T[] = [];

	let index: number;
	while ((index = findIndex(array, item, comparisonStrategy)) !== -1) {
		const removed = array.splice(index, 1);

		if (removed.length > 0) {
			if (isEqual(removed[0]!, item, comparisonStrategy)) {
				removedItems.push(removed[0]!);
			} else {
				// Re-insert the item if it does not match
				array.splice(index, 0, ...removed);
			}
		}
	}

	return removedItems;
}
