/**
 * Yields each element `times` times in a row before moving to the next.
 *
 * Not `cycle`, which repeats the whole sequence rather than each element:
 * `repeatEach([1, 2], 2)` yields `1, 1, 2, 2` where `cycle([1, 2], 2)` yields
 * `1, 2, 1, 2`.
 *
 * Time complexity: O(n × times). Nothing is buffered.
 *
 * @param iterable The input iterable.
 * @param times How many times to repeat each element. Must be a non-negative
 *   integer; zero yields nothing.
 * @returns An iterator over the repeated elements.
 * @throws {RangeError} If `times` is not a non-negative integer.
 */
export function* repeatEach<T>(
	iterable: Iterable<T>,
	times: number,
): IterableIterator<T> {
	if (!Number.isInteger(times) || times < 0) {
		throw new RangeError("repeatEach times must be a non-negative integer");
	}

	if (times === 0) {
		return;
	}

	for (const item of iterable) {
		for (let repeat = 0; repeat < times; repeat++) {
			yield item;
		}
	}
}
