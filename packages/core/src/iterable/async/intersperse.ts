import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields `separator` between consecutive elements, with none before the first
 * or after the last.
 *
 * The async counterpart of `intersperse`.
 *
 * Time complexity: O(1) per element.
 *
 * @param iterable The input iterable, sync or async.
 * @param separator The value to place between elements.
 * @returns An iterator over the elements, separated.
 */
export async function* intersperseAsync<T, S>(
	iterable: MaybeAsyncIterable<T>,
	separator: S,
): AsyncIterableIterator<T | S> {
	let isFirst = true;

	for await (const item of iterable) {
		if (!isFirst) {
			yield separator;
		}

		yield item;
		isFirst = false;
	}
}
