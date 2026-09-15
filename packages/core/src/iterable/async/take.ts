import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields at most the first `count` elements, then stops.
 *
 * The async counterpart of `take`. The source is closed as soon as the quota is
 * met, so taking from an endless stream terminates.
 *
 * Time complexity: O(count).
 *
 * @param iterable The input iterable, sync or async.
 * @param count How many elements to yield. Must be a non-negative integer.
 * @returns An iterator over the leading elements.
 * @throws {RangeError} If `count` is not a non-negative integer.
 */
export async function* takeAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	count: number,
): AsyncIterableIterator<T> {
	if (!Number.isInteger(count) || count < 0) {
		throw new RangeError("takeAsync count must be a non-negative integer");
	}

	if (count === 0) {
		return;
	}

	let taken = 0;

	for await (const item of iterable) {
		yield item;

		if (++taken >= count) {
			return;
		}
	}
}
