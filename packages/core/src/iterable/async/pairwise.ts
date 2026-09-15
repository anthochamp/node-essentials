import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields each consecutive overlapping pair of elements.
 *
 * The async counterpart of `pairwise`. An input of fewer than two elements
 * yields nothing.
 *
 * Time complexity: O(n), allocating one tuple per pair.
 *
 * @param iterable The input iterable, sync or async.
 * @returns An iterator over the pairs, each holding an element and the one
 *   after it.
 */
export async function* pairwiseAsync<T>(
	iterable: MaybeAsyncIterable<T>,
): AsyncIterableIterator<[T, T]> {
	let previous: T;
	let hasPrevious = false;

	for await (const item of iterable) {
		if (hasPrevious) {
			yield [previous!, item];
		}

		previous = item;
		hasPrevious = true;
	}
}
