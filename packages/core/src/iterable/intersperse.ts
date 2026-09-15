/**
 * Yields `separator` between consecutive elements, with none before the first
 * or after the last.
 *
 * `Array.prototype.join` for values that are not strings, and lazy.
 *
 * Time complexity: O(1) per element.
 *
 * @param iterable The input iterable.
 * @param separator The value to place between elements.
 * @returns An iterator over the elements, separated. Empty when the input is,
 *   and a single element is yielded alone.
 */
export function* intersperse<T, S>(
	iterable: Iterable<T>,
	separator: S,
): IterableIterator<T | S> {
	let isFirst = true;

	for (const item of iterable) {
		if (!isFirst) {
			yield separator;
		}

		yield item;
		isFirst = false;
	}
}
