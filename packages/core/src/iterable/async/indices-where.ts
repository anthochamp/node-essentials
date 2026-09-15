import type { MaybeAsyncPredicate } from "../../types/callable.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields the zero-based index of every element satisfying `predicate`, rather
 * than the elements themselves.
 *
 * The async counterpart of `indicesWhere`.
 *
 * Time complexity: O(1) per element.
 *
 * @param iterable The input iterable, sync or async.
 * @param predicate Receives each element and its zero-based index.
 * @returns An iterator over the matching indices, ascending.
 */
export async function* indicesWhereAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	predicate: MaybeAsyncPredicate<[T, number]>,
): AsyncIterableIterator<number> {
	let index = 0;

	for await (const item of iterable) {
		if (await predicate(item, index)) {
			yield index;
		}

		index++;
	}
}

/**
 * Yields the zero-based index of every element satisfying `predicate`, scanning
 * from the end.
 *
 * The async counterpart of `lastIndicesWhere`. An async source has no end to
 * start from, so the whole of it is materialised first and held in memory.
 *
 * Time complexity: O(n). Memory: O(n).
 *
 * @param iterable The input iterable, sync or async.
 * @param predicate Receives each element and its zero-based index.
 * @param signal Aborts the materialisation.
 * @returns An iterator over the matching indices, descending.
 */
export async function* lastIndicesWhereAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	predicate: MaybeAsyncPredicate<[T, number]>,
	signal?: AbortSignal,
): AsyncIterableIterator<number> {
	signal?.throwIfAborted();

	const items: T[] = [];

	for await (const item of iterable) {
		signal?.throwIfAborted();
		items.push(item);
	}

	for (let index = items.length - 1; index >= 0; index--) {
		if (await predicate(items[index]!, index)) {
			yield index;
		}
	}
}
