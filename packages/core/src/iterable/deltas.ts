import type { Callable } from "../types/callable.js";

/**
 * Yields the difference between each element and the one before it.
 *
 * `subtract` is required rather than defaulting to numeric subtraction: the
 * operation is the caller's, which is what keeps this out of the math packages
 * — nothing here computes on numbers, it only applies what it is given.
 *
 * Arguments reach `subtract` as `(current, previous)`, so numeric subtraction
 * makes an increase positive.
 *
 * An input of fewer than two elements yields nothing, so there is always one
 * fewer delta than there are elements.
 *
 * Time complexity: O(1) per element, plus whatever `subtract` costs.
 *
 * @param iterable The input iterable.
 * @param subtract Computes the difference between an element and its
 *   predecessor.
 * @returns An iterator over the consecutive differences.
 */
export function* deltas<T, D>(
	iterable: Iterable<T>,
	subtract: Callable<[T, T], D>,
): IterableIterator<D> {
	let previous: T;
	let hasPrevious = false;

	for (const item of iterable) {
		if (hasPrevious) {
			yield subtract(item, previous!);
		}

		previous = item;
		hasPrevious = true;
	}
}
