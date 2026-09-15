import type { MaybeAsyncCallable } from "../../types/callable.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields the difference between each element and the one before it.
 *
 * The async counterpart of `deltas`. `subtract` is required rather than
 * defaulting to numeric subtraction, and receives `(current, previous)`.
 *
 * Time complexity: O(1) per element, plus whatever `subtract` costs.
 *
 * @param iterable The input iterable, sync or async.
 * @param subtract Computes the difference between an element and its
 *   predecessor.
 * @returns An iterator over the consecutive differences.
 */
export async function* deltasAsync<T, D>(
	iterable: MaybeAsyncIterable<T>,
	subtract: MaybeAsyncCallable<[T, T], D>,
): AsyncIterableIterator<D> {
	let previous: T;
	let hasPrevious = false;

	for await (const item of iterable) {
		if (hasPrevious) {
			yield await subtract(item, previous!);
		}

		previous = item;
		hasPrevious = true;
	}
}
