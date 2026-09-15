import type { Predicate } from "../types/callable.js";

/**
 * Yields the zero-based index of every element satisfying `predicate`, rather
 * than the elements themselves.
 *
 * Time complexity: O(1) per element.
 *
 * @param iterable The input iterable.
 * @param predicate Receives each element and its zero-based index.
 * @returns An iterator over the matching indices, ascending.
 */
export function* indicesWhere<T>(
	iterable: Iterable<T>,
	predicate: Predicate<[T, number]>,
): IterableIterator<number> {
	let index = 0;

	for (const item of iterable) {
		if (predicate(item, index)) {
			yield index;
		}

		index++;
	}
}

/**
 * Yields the zero-based index of every element satisfying `predicate`, scanning
 * from the end.
 *
 * Indices are still counted from the start — only the order they are yielded in
 * is reversed, so the result is `indicesWhere` reversed.
 *
 * An iterable has no end to start from, so a non-array source is materialised
 * first and the whole of it is held in memory. An array is walked backwards in
 * place.
 *
 * Time complexity: O(n), with O(n) memory for a non-array source and O(1) for
 * an array.
 *
 * @param iterable The input iterable.
 * @param predicate Receives each element and its zero-based index.
 * @returns An iterator over the matching indices, descending.
 */
export function* lastIndicesWhere<T>(
	iterable: Iterable<T>,
	predicate: Predicate<[T, number]>,
): IterableIterator<number> {
	const items = Array.isArray(iterable) ? (iterable as T[]) : [...iterable];

	for (let index = items.length - 1; index >= 0; index--) {
		if (predicate(items[index]!, index)) {
			yield index;
		}
	}
}
