import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Lazily chains any number of iterables into one.
 *
 * The async counterpart of `concat`. Sources may be freely mixed: an array and
 * a stream can be chained together.
 *
 * Time complexity: O(1) to construct; iterating the result is O(n) total across
 * every source iterable.
 *
 * @param iterables The iterables to chain, in order.
 * @returns An iterator yielding every element of the first iterable, then every
 *   element of the second, and so on.
 */
export async function* concatAsync<T>(
	...iterables: MaybeAsyncIterable<T>[]
): AsyncIterableIterator<T> {
	for (const iterable of iterables) {
		yield* iterable;
	}
}
