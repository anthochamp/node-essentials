import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Lazily concatenates an iterable of iterables, one level deep.
 *
 * The async counterpart of `flatten`. Both levels may be sync or async, so a
 * stream of arrays and an array of streams both flatten.
 *
 * Time complexity: O(1) to construct; O(n) total across every inner iterable.
 *
 * @param iterable The iterable of iterables to flatten.
 * @returns An iterator over every element of every inner iterable, in order.
 */
export async function* flattenAsync<T>(
	iterable: MaybeAsyncIterable<MaybeAsyncIterable<T>>,
): AsyncIterableIterator<T> {
	for await (const inner of iterable) {
		yield* inner;
	}
}
