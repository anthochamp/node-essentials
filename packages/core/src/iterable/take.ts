/**
 * Yields at most the first `count` elements, then stops.
 *
 * What `Array.prototype.slice(0, count)` does for an array, without
 * materialising, and without needing to know the length up front. The source is
 * closed as soon as the quota is met, so taking from an infinite iterable
 * terminates.
 *
 * Time complexity: O(count).
 *
 * @param iterable The input iterable.
 * @param count How many elements to yield. Must be a non-negative integer; zero
 *   yields nothing and consumes nothing.
 * @returns An iterator over the leading elements.
 * @throws {RangeError} If `count` is not a non-negative integer.
 */
export function* take<T>(
	iterable: Iterable<T>,
	count: number,
): IterableIterator<T> {
	if (!Number.isInteger(count) || count < 0) {
		throw new RangeError("take count must be a non-negative integer");
	}

	if (count === 0) {
		return;
	}

	let taken = 0;

	for (const item of iterable) {
		yield item;

		if (++taken >= count) {
			return;
		}
	}
}
