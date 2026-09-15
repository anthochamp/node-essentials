import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields everything after the first `count` elements.
 *
 * The async counterpart of `drop`. An input shorter than `count` yields
 * nothing.
 *
 * Time complexity: O(n) — the skipped elements are still pulled from the
 * source, because an iterable offers no way to seek past them.
 *
 * @param iterable The input iterable, sync or async.
 * @param count How many elements to skip. Must be a non-negative integer.
 * @returns An iterator over the remaining elements.
 * @throws {RangeError} If `count` is not a non-negative integer.
 */
export async function* dropAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	count: number,
): AsyncIterableIterator<T> {
	if (!Number.isInteger(count) || count < 0) {
		throw new RangeError("dropAsync count must be a non-negative integer");
	}

	let dropped = 0;

	for await (const item of iterable) {
		if (dropped < count) {
			dropped++;
			continue;
		}

		yield item;
	}
}
