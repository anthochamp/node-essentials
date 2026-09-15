import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Removes null and undefined values from an iterable.
 *
 * The async counterpart of `compact`.
 *
 * Time complexity: O(1) per element.
 *
 * @param iterable The input iterable, sync or async.
 * @returns An iterator yielding only non-null and non-undefined values.
 */
export async function* compactAsync<T extends {}>(
	iterable: MaybeAsyncIterable<T | null | undefined>,
): AsyncIterableIterator<T> {
	for await (const item of iterable) {
		if (item !== null && item !== undefined) {
			yield item;
		}
	}
}
