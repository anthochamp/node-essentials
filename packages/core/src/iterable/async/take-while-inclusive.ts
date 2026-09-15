import type { MaybeAsyncPredicate } from "../../types/callable.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields elements for as long as `predicate` holds, _including_ the first one
 * that fails it.
 *
 * The async counterpart of `takeWhileInclusive`, and one of the two cases
 * `takeWhileAsync` gets wrong: it consumes the failing element and discards it,
 * which loses a terminator a caller needs.
 *
 * Time complexity: O(1) per element, over the prefix only.
 *
 * @param iterable The input iterable, sync or async.
 * @param predicate Receives each element and its zero-based index. The first
 *   element it rejects is yielded, and iteration stops after it.
 * @returns An iterator over the prefix, terminator included.
 */
export async function* takeWhileInclusiveAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	predicate: MaybeAsyncPredicate<[T, number]>,
): AsyncIterableIterator<T> {
	let index = 0;

	for await (const item of iterable) {
		yield item;

		if (!(await predicate(item, index++))) {
			return;
		}
	}
}
