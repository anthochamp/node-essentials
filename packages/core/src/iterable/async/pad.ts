import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields the elements, then `fill` as many times as needed to reach `length`.
 *
 * The async counterpart of `pad`. An input already at or beyond `length` passes
 * through unchanged — this only ever adds, never truncates.
 *
 * Time complexity: O(max(n, length)).
 *
 * @param iterable The input iterable, sync or async.
 * @param length The width to pad up to. Must be a non-negative integer.
 * @param fill The value to pad with.
 * @returns An iterator over the elements followed by the padding.
 * @throws {RangeError} If `length` is not a non-negative integer.
 */
export async function* padAsync<T, F>(
	iterable: MaybeAsyncIterable<T>,
	length: number,
	fill: F,
): AsyncIterableIterator<T | F> {
	if (!Number.isInteger(length) || length < 0) {
		throw new RangeError("padAsync length must be a non-negative integer");
	}

	let yielded = 0;

	for await (const item of iterable) {
		yielded++;
		yield item;
	}

	for (; yielded < length; yielded++) {
		yield fill;
	}
}
