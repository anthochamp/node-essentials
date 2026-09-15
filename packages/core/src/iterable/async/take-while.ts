import type { MaybeAsyncPredicate } from "../../types/callable.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields elements from the start for as long as `predicate` holds, stopping at
 * the first one it rejects.
 *
 * The async counterpart of `takeWhile`. The predicate may itself be async.
 *
 * Time complexity: O(1) per element, over the prefix only.
 *
 * @param iterable The input iterable, sync or async.
 * @param predicate Receives each element and its zero-based index. Yielding
 *   stops the first time it resolves `false`.
 * @returns An iterator over the leading elements that satisfy `predicate`.
 */
export async function* takeWhileAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	predicate: MaybeAsyncPredicate<[T, number]>,
): AsyncIterableIterator<T> {
	let index = 0;

	for await (const item of iterable) {
		if (!(await predicate(item, index++))) {
			return;
		}

		yield item;
	}
}
