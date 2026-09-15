import type { Callable } from "@ac-kit/core";

import { binarySearch } from "./_binary-search.js";

/**
 * Finds the index of the element in `items` whose key is closest to `value`.
 *
 * Takes a numeric key accessor rather than a comparator: "nearest" is a metric
 * question, and a comparator only reports which side an element falls on, never
 * how far away it is. Ties resolve to the right-hand neighbour.
 *
 * O(log n). `valueOf` must return finite, non-`NaN` keys — `NaN` has no
 * magnitude, so a distance derived from one is meaningless.
 *
 * @param items Array sorted ascending by `valueOf`. Must be non-empty.
 * @param value The key to find the closest element to.
 * @param valueOf Extracts the numeric sort key from an item.
 * @returns The index of the closest element.
 */
export function bisectCenter<T>(
	items: readonly T[],
	value: number,
	valueOf: Callable<[T], number>,
): number {
	const index = binarySearch(
		0,
		items.length,
		(probe) => valueOf(items[probe]!) < value,
	);

	if (index === 0) {
		return 0;
	}
	if (index === items.length) {
		return items.length - 1;
	}

	const toPrevious = value - valueOf(items[index - 1]!);
	const toNext = valueOf(items[index]!) - value;

	return toPrevious < toNext ? index - 1 : index;
}
