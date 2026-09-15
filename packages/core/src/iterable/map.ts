import type { Callable } from "../types/callable.js";

/**
 * Yields `mapper(element)` for each element, lazily.
 *
 * The `Iterable`-shaped counterpart of `Array.prototype.map` and of
 * `Iterator.prototype.map`, neither of which accepts a plain `Iterable` without
 * first materializing it or wrapping it in `Iterator.from`.
 *
 * Use {@link filterMap} when the mapper also needs to drop elements, and
 * {@link tap} when the callback is a side effect rather than a transform.
 *
 * Time complexity: O(1) per element, plus whatever `mapper` costs.
 *
 * @param iterable The input iterable.
 * @param mapper Receives each element and its zero-based index.
 * @returns An iterator over the mapped values.
 */
export function* map<T, R>(
	iterable: Iterable<T>,
	mapper: Callable<[T, number], R>,
): IterableIterator<R> {
	let index = 0;

	for (const item of iterable) {
		yield mapper(item, index++);
	}
}
