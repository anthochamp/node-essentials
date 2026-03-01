import type { Predicate } from "../function/types.js";
import { type IsEqualWellKnownStrategy, isEqual } from "../object/is-equal.js";

/**
 * Removes all occurrences of an item from an array safely, ensuring that only
 * exact matches are removed.
 *
 * In concurrent scenarios, it's possible that the item at a found index may have
 * changed before the removal occurs. This function checks that the removed item
 * is indeed the one intended for removal, and if not, it re-inserts it back into
 * the array.
 *
 * @param array The array to remove items from.
 * @param item The item to remove.
 * @returns An array of removed items.
 */
export function removeSafe<T>(
	array: T[],
	item: T,
	strategy: IsEqualWellKnownStrategy | Predicate<[T, T]> = "strict",
): T[] {
	const removedItems: T[] = [];

	let index: number;
	while ((index = array.indexOf(item)) !== -1) {
		const removed = array.splice(index, 1);

		if (removed.length > 0) {
			// biome-ignore lint/style/noNonNullAssertion: non-concurrent scenario guarantees removed has at least one item
			if (isEqual(removed[0]!, item, strategy)) {
				// biome-ignore lint/style/noNonNullAssertion: non-concurrent scenario guarantees removed has at least one item
				removedItems.push(removed[0]!);
			} else {
				// Re-insert the item if it does not match
				array.splice(index, 0, ...removed);
			}
		}
	}

	return removedItems;
}
