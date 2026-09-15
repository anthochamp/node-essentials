/**
 * Yields consecutive, non-overlapping groups of `size` items.
 *
 * The inverse of `Array.prototype.flat()`, which already covers the other
 * direction natively. A final group shorter than `size` is yielded as-is when
 * the input length is not a multiple of it.
 *
 * Time complexity: O(n).
 *
 * @param iterable The input iterable.
 * @param size How many items per group. Must be a positive integer.
 * @returns An iterator over the groups.
 * @throws {RangeError} If `size` is not a positive integer.
 */
export function* chunk<T>(
	iterable: Iterable<T>,
	size: number,
): IterableIterator<T[]> {
	if (!Number.isInteger(size) || size < 1) {
		throw new RangeError("chunk size must be a positive integer");
	}

	let group: T[] = [];

	for (const item of iterable) {
		group.push(item);

		if (group.length === size) {
			yield group;
			group = [];
		}
	}

	if (group.length > 0) {
		yield group;
	}
}
