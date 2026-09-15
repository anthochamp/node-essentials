/**
 * Lazily concatenates an iterable of iterables, one level deep.
 *
 * The counterpart of `Array.prototype.flat()`, and the same operation `concat`
 * performs — this one takes the sources as a single iterable rather than as
 * arguments, so it can flatten a stream of streams.
 *
 * A `string` is an `Iterable<string>`, so an `Iterable<string>` satisfies this
 * signature and flattens to characters. That is what the type says; use
 * `flattenDeep`, which never descends into a string, if that is not wanted.
 *
 * Time complexity: O(1) to construct; O(n) total across every inner iterable.
 *
 * @param iterable The iterable of iterables to flatten.
 * @returns An iterator over every element of every inner iterable, in order.
 */
export function* flatten<T>(
	iterable: Iterable<Iterable<T>>,
): IterableIterator<T> {
	for (const inner of iterable) {
		yield* inner;
	}
}
