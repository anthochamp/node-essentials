import type { DefinedValue } from "../types/defined-value.js";

/**
 * Returns the element at `index`, or `undefined` when the iterable is shorter
 * than that.
 *
 * `T` cannot itself include `undefined`, so the absent case is never ambiguous.
 *
 * Only counts forward. `Array.prototype.at`'s negative index would mean
 * buffering the whole tail to know where the end is, so it is rejected rather
 * than paid for silently — `last` covers the `-1` case in O(1) for an array.
 *
 * Time complexity: O(index). The iterator is closed as soon as the element is
 * reached, without draining the rest.
 *
 * @param iterable The iterable to read from.
 * @param index The zero-based position to read. Must be a non-negative integer.
 * @returns The element at `index`, or `undefined` if there is none.
 * @throws {RangeError} If `index` is not a non-negative integer.
 */
export function nth<T extends DefinedValue>(
	iterable: Iterable<T>,
	index: number,
): T | undefined {
	if (!Number.isInteger(index) || index < 0) {
		throw new RangeError("nth index must be a non-negative integer");
	}

	let position = 0;

	for (const item of iterable) {
		if (position === index) {
			return item;
		}

		position++;
	}

	return undefined;
}
