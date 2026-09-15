/**
 * Yields the elements, then `fill` as many times as needed to reach `length`.
 *
 * An input already at or beyond `length` passes through unchanged — this only
 * ever adds, never truncates. Combine with `take` to get a fixed width either
 * way.
 *
 * Time complexity: O(max(n, length)).
 *
 * @param iterable The input iterable.
 * @param length The width to pad up to. Must be a non-negative integer.
 * @param fill The value to pad with.
 * @returns An iterator over the elements followed by the padding.
 * @throws {RangeError} If `length` is not a non-negative integer.
 */
export function* pad<T, F>(
	iterable: Iterable<T>,
	length: number,
	fill: F,
): IterableIterator<T | F> {
	if (!Number.isInteger(length) || length < 0) {
		throw new RangeError("pad length must be a non-negative integer");
	}

	let yielded = 0;

	for (const item of iterable) {
		yielded++;
		yield item;
	}

	for (; yielded < length; yielded++) {
		yield fill;
	}
}
