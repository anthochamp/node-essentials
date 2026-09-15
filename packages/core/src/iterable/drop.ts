/**
 * Yields everything after the first `count` elements.
 *
 * What `Array.prototype.slice(count)` does for an array, without materialising.
 * An input shorter than `count` yields nothing.
 *
 * Time complexity: O(n) — the skipped elements are still pulled from the
 * source, because an iterable offers no way to seek past them.
 *
 * @param iterable The input iterable.
 * @param count How many elements to skip. Must be a non-negative integer.
 * @returns An iterator over the remaining elements.
 * @throws {RangeError} If `count` is not a non-negative integer.
 */
export function* drop<T>(
	iterable: Iterable<T>,
	count: number,
): IterableIterator<T> {
	if (!Number.isInteger(count) || count < 0) {
		throw new RangeError("drop count must be a non-negative integer");
	}

	let dropped = 0;

	for (const item of iterable) {
		if (dropped < count) {
			dropped++;
			continue;
		}

		yield item;
	}
}
