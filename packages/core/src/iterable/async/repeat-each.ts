import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields each element `times` times in a row before moving to the next.
 *
 * The async counterpart of `repeatEach`. Not `cycleAsync`, which repeats the
 * whole sequence rather than each element.
 *
 * Time complexity: O(n × times). Nothing is buffered.
 *
 * @param iterable The input iterable, sync or async.
 * @param times How many times to repeat each element. Must be a non-negative
 *   integer.
 * @returns An iterator over the repeated elements.
 * @throws {RangeError} If `times` is not a non-negative integer.
 */
export async function* repeatEachAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	times: number,
): AsyncIterableIterator<T> {
	if (!Number.isInteger(times) || times < 0) {
		throw new RangeError(
			"repeatEachAsync times must be a non-negative integer",
		);
	}

	if (times === 0) {
		return;
	}

	for await (const item of iterable) {
		for (let repeat = 0; repeat < times; repeat++) {
			yield item;
		}
	}
}
