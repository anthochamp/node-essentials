/**
 * Yields each consecutive overlapping pair of elements.
 *
 * The `size = 2` case of `windowed`, kept separate so the result is a `[T, T]`
 * tuple rather than a `T[]` a caller has to assert the width of.
 *
 * An input of fewer than two elements yields nothing.
 *
 * Time complexity: O(n), allocating one tuple per pair.
 *
 * @param iterable The input iterable.
 * @returns An iterator over the pairs, each holding an element and the one
 *   after it.
 */
export function* pairwise<T>(iterable: Iterable<T>): IterableIterator<[T, T]> {
	let previous: T;
	let hasPrevious = false;

	for (const item of iterable) {
		if (hasPrevious) {
			yield [previous!, item];
		}

		previous = item;
		hasPrevious = true;
	}
}
