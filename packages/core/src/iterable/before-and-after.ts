import type { Predicate } from "../types/callable.js";

/**
 * Splits an iterable at the first element failing `predicate`, returning the
 * prefix and the remainder as two iterators over the same source.
 *
 * The other case `takeWhile` gets wrong: it discards everything from the split
 * point on. Here the failing element starts the second iterator, so nothing is
 * lost and the source is still only walked once.
 *
 * The two share one underlying iterator, so **the first must be consumed before
 * the second**. Reading the second early is allowed and drains the first
 * silently, discarding its elements — that is the only way to know where the
 * split is. Abandoning the first part-way is also allowed: the second then
 * resumes from wherever the source was left, with no boundary element.
 *
 * Time complexity: O(1) per element. Memory: O(1) — one element is held at the
 * boundary, never the prefix.
 *
 * @param iterable The input iterable.
 * @param predicate Receives each element and its zero-based index.
 * @returns The leading elements that satisfy `predicate`, then the rest
 *   starting at the first that does not.
 */
export function beforeAndAfter<T>(
	iterable: Iterable<T>,
	predicate: Predicate<[T, number]>,
): [before: IterableIterator<T>, after: IterableIterator<T>] {
	const iterator = iterable[Symbol.iterator]();
	let boundary: IteratorResult<T> | undefined;

	function* before(): IterableIterator<T> {
		let index = 0;

		while (boundary === undefined) {
			const result = iterator.next();

			if (result.done === true || !predicate(result.value, index++)) {
				boundary = result;
				return;
			}

			yield result.value;
		}
	}

	const beforeIterator = before();

	function* after(): IterableIterator<T> {
		// A `before` abandoned early closes without reaching the split, so stop
		// draining when it reports done rather than waiting for a boundary.
		while (boundary === undefined) {
			if (beforeIterator.next().done === true) {
				break;
			}
		}

		if (boundary !== undefined && boundary.done !== true) {
			yield boundary.value;
		}

		while (true) {
			const result = iterator.next();

			if (result.done === true) {
				return;
			}

			yield result.value;
		}
	}

	return [beforeIterator, after()];
}
