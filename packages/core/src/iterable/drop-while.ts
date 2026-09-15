import type { Predicate } from "../types/callable.js";

/**
 * Skips elements from the start for as long as `predicate` holds, then yields
 * everything from the first rejected element onwards.
 *
 * The predicate is not consulted again once it has rejected, so a later element
 * that would satisfy it is still yielded. That is what separates this from
 * filtering.
 *
 * Time complexity: O(1) per element.
 *
 * @param iterable The input iterable.
 * @param predicate Receives each element and its zero-based index. Skipping
 *   stops the first time it returns `false`.
 * @returns An iterator over the elements from the first rejection onwards.
 */
export function* dropWhile<T>(
	iterable: Iterable<T>,
	predicate: Predicate<[T, number]>,
): IterableIterator<T> {
	let index = 0;
	let dropping = true;

	for (const item of iterable) {
		if (dropping && predicate(item, index++)) {
			continue;
		}

		dropping = false;
		yield item;
	}
}
