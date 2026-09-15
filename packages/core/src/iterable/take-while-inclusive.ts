import type { Predicate } from "../types/callable.js";

/**
 * Yields elements for as long as `predicate` holds, _including_ the first one
 * that fails it.
 *
 * One of the two cases `takeWhile` gets wrong: it consumes the failing element
 * and discards it, which loses a terminator a caller needs — a delimiter, a
 * sentinel, the record that closed a run. Use `beforeAndAfter` when both sides
 * are wanted.
 *
 * Time complexity: O(1) per element, over the prefix only.
 *
 * @param iterable The input iterable.
 * @param predicate Receives each element and its zero-based index. The first
 *   element it rejects is yielded, and iteration stops after it.
 * @returns An iterator over the prefix, terminator included.
 */
export function* takeWhileInclusive<T>(
	iterable: Iterable<T>,
	predicate: Predicate<[T, number]>,
): IterableIterator<T> {
	let index = 0;

	for (const item of iterable) {
		yield item;

		if (!predicate(item, index++)) {
			return;
		}
	}
}
