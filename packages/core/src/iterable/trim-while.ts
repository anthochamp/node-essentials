import type { Predicate } from "../types/callable.js";
import { dropWhile } from "./drop-while.js";

/**
 * Yields the elements with any trailing run satisfying `predicate` removed.
 *
 * The generic form of `String.prototype.trimEnd`. An element is only known to
 * be trailing once something that fails `predicate` follows it, so a run of
 * candidates is held back until then — a source ending in a long run of matches
 * buffers that whole run.
 *
 * Time complexity: O(n). Memory: O(longest matching run).
 *
 * @param iterable The input iterable.
 * @param predicate Decides whether an element may be trimmed.
 * @returns An iterator over the elements, trailing matches removed.
 */
export function* trimEndWhile<T>(
	iterable: Iterable<T>,
	predicate: Predicate<[T]>,
): IterableIterator<T> {
	const pending: T[] = [];

	for (const item of iterable) {
		if (predicate(item)) {
			pending.push(item);
			continue;
		}

		yield* pending;
		pending.length = 0;
		yield item;
	}
}

/**
 * Yields the elements with any leading _and_ trailing run satisfying
 * `predicate` removed.
 *
 * The generic form of `String.prototype.trim`. The start-only case is
 * `dropWhile`, which this composes rather than duplicating.
 *
 * Time complexity: O(n). Memory: O(longest matching run), as `trimEndWhile`.
 *
 * @param iterable The input iterable.
 * @param predicate Decides whether an element may be trimmed.
 * @returns An iterator over the elements, leading and trailing matches removed.
 */
export function trimWhile<T>(
	iterable: Iterable<T>,
	predicate: Predicate<[T]>,
): IterableIterator<T> {
	return trimEndWhile(
		dropWhile(iterable, (item) => predicate(item)),
		predicate,
	);
}
