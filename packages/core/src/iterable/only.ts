/**
 * Returns the single element of an iterable, rejecting any other count.
 *
 * Boundary validation, and the readable form of `items.length === 1 ? items[0]
 * : throw`. Use `one` where an empty iterable is acceptable.
 *
 * Time complexity: O(1) — at most two elements are pulled, so this is safe on
 * an infinite iterable.
 *
 * @param iterable The iterable to read from.
 * @returns The single element.
 * @throws {RangeError} If the iterable is empty or holds more than one element.
 */
export function only<T>(iterable: Iterable<T>): T {
	const iterator = iterable[Symbol.iterator]();
	const first = iterator.next();

	if (first.done === true) {
		throw new RangeError("expected exactly one item, found none");
	}

	if (iterator.next().done !== true) {
		iterator.return?.();

		throw new RangeError("expected exactly one item, found more");
	}

	return first.value;
}
