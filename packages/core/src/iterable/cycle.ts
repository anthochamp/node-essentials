/**
 * Yields the whole iterable `times` times over.
 *
 * The source is pulled once and buffered, because an iterator cannot be
 * restarted — so the whole of it is held in memory from the first pass
 * onwards.
 *
 * Time complexity: O(n × times). Memory: O(n).
 *
 * @param iterable The input iterable.
 * @param times How many passes to yield. Must be a non-negative integer or
 *   `Infinity`, which repeats forever. Zero yields nothing and consumes
 *   nothing.
 * @returns An iterator over the repeated elements.
 * @throws {RangeError} If `times` is negative, fractional or `NaN`.
 */
export function* cycle<T>(
	iterable: Iterable<T>,
	times: number = Number.POSITIVE_INFINITY,
): IterableIterator<T> {
	if (
		times !== Number.POSITIVE_INFINITY &&
		(!Number.isInteger(times) || times < 0)
	) {
		throw new RangeError(
			"cycle times must be a non-negative integer or Infinity",
		);
	}

	if (times === 0) {
		return;
	}

	const buffer: T[] = [];

	for (const item of iterable) {
		buffer.push(item);
		yield item;
	}

	if (buffer.length === 0) {
		return;
	}

	for (let pass = 1; pass < times; pass++) {
		yield* buffer;
	}
}
