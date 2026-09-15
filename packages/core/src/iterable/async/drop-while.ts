import type { MaybeAsyncPredicate } from "../../types/callable.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Skips elements from the start for as long as `predicate` holds, then yields
 * everything from the first rejected element onwards.
 *
 * The async counterpart of `dropWhile`. The predicate is not consulted again
 * once it has rejected.
 *
 * Time complexity: O(1) per element.
 *
 * @param iterable The input iterable, sync or async.
 * @param predicate Receives each element and its zero-based index. Skipping
 *   stops the first time it resolves `false`.
 * @returns An iterator over the elements from the first rejection onwards.
 */
export async function* dropWhileAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	predicate: MaybeAsyncPredicate<[T, number]>,
): AsyncIterableIterator<T> {
	let index = 0;
	let dropping = true;

	for await (const item of iterable) {
		if (dropping && (await predicate(item, index++))) {
			continue;
		}

		dropping = false;
		yield item;
	}
}
