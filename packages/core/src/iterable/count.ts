import { isMap } from "../guards/is-map.js";
import { isSet } from "../guards/is-set.js";

/**
 * Counts the elements of an iterable, consuming it.
 *
 * Named for what it returns rather than `length`, which would promise O(1).
 *
 * Time complexity: O(1) for an `Array`, `Set` or `Map`, which already know
 * their own size; O(n) for anything else, which has to be drained.
 *
 * @param iterable The iterable to count.
 * @returns How many elements it yielded.
 */
export function count(iterable: Iterable<unknown>): number {
	if (Array.isArray(iterable)) {
		return iterable.length;
	}
	if (isSet(iterable) || isMap(iterable)) {
		return iterable.size;
	}

	const iterator = iterable[Symbol.iterator]();
	let total = 0;

	while (iterator.next().done !== true) {
		total++;
	}

	return total;
}
