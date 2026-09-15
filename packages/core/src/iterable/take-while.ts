import type { Predicate } from "../types/callable.js";

/**
 * Yields elements from the start for as long as `predicate` holds, stopping at
 * the first one it rejects.
 *
 * The rejecting element is consumed but not yielded, and nothing after it is
 * pulled — use `takeWhileInclusive` to keep it, or `beforeAndAfter` to keep
 * both sides.
 *
 * Time complexity: O(1) per element, over the prefix only.
 *
 * @param iterable The input iterable.
 * @param predicate Receives each element and its zero-based index. Yielding
 *   stops the first time it returns `false`.
 * @returns An iterator over the leading elements that satisfy `predicate`.
 */
export function* takeWhile<T>(
	iterable: Iterable<T>,
	predicate: Predicate<[T, number]>,
): IterableIterator<T> {
	let index = 0;

	for (const item of iterable) {
		if (!predicate(item, index++)) {
			return;
		}

		yield item;
	}
}
