import type { MaybeAsyncCallable } from "../../types/callable.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields `mapper(element)` for each element, lazily.
 *
 * The async counterpart of `map`.
 *
 * Time complexity: O(1) per element, plus whatever `mapper` costs.
 *
 * @param iterable The input iterable, sync or async.
 * @param mapper Receives each element and its zero-based index.
 * @returns An iterator over the mapped values.
 */
export async function* mapAsync<T, R>(
	iterable: MaybeAsyncIterable<T>,
	mapper: MaybeAsyncCallable<[T, number], R>,
): AsyncIterableIterator<R> {
	let index = 0;

	for await (const item of iterable) {
		yield await mapper(item, index++);
	}
}
