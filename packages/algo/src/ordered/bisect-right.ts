import { binarySearch } from "./_binary-search.js";

/**
 * Finds the rightmost index in `items` where `value` could be inserted while
 * keeping `items` sorted — after any existing element considered equivalent to
 * it.
 *
 * O(log n) via binary search. `items` must already be sorted by `compare`.
 *
 * @param items Array sorted ascending by `compare`.
 * @param value The value to find an insertion point for.
 * @param compare Orders an item against `value`: negative if the item precedes
 *   it, positive if the item follows it, `0` if equivalent.
 * @returns The rightmost valid insertion index, in `[0, items.length]`.
 */
export function bisectRight<T, V = T>(
	items: readonly T[],
	value: V,
	compare: (item: T, value: V) => number,
): number {
	return binarySearch(
		0,
		items.length,
		(index) => compare(items[index]!, value) <= 0,
	);
}
