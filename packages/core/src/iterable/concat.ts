/**
 * Lazily chains any number of iterables into one.
 *
 * Time complexity: O(1) to construct; iterating the result is O(n) total across
 * every source iterable, same as iterating each individually.
 *
 * @param iterables The iterables to chain, in order.
 * @returns An iterator yielding every element of the first iterable, then every
 *   element of the second, and so on.
 */
export function* concat<T>(...iterables: Iterable<T>[]): IterableIterator<T> {
	for (const iterable of iterables) {
		yield* iterable;
	}
}
