import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields consecutive, non-overlapping groups of `size` items.
 *
 * The async counterpart of `chunk`. A final group shorter than `size` is
 * yielded as-is when the input length is not a multiple of it.
 *
 * Time complexity: O(n).
 *
 * @param iterable The input iterable, sync or async.
 * @param size How many items per group. Must be a positive integer.
 * @returns An iterator over the groups.
 * @throws {RangeError} If `size` is not a positive integer.
 */
export async function* chunkAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	size: number,
): AsyncIterableIterator<T[]> {
	if (!Number.isInteger(size) || size < 1) {
		throw new RangeError("chunkAsync size must be a positive integer");
	}

	let group: T[] = [];

	for await (const item of iterable) {
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
