import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Yields the whole iterable `times` times over.
 *
 * The async counterpart of `cycle`. The source is pulled once and buffered,
 * because an iterator cannot be restarted, so the whole of it is held in memory
 * from the first pass onwards. Later passes yield from the buffer and never
 * await.
 *
 * Time complexity: O(n × times). Memory: O(n).
 *
 * @param iterable The input iterable, sync or async.
 * @param times How many passes to yield. Must be a non-negative integer or
 *   `Infinity`, which repeats forever.
 * @returns An iterator over the repeated elements.
 * @throws {RangeError} If `times` is negative, fractional or `NaN`.
 */
export async function* cycleAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	times: number = Number.POSITIVE_INFINITY,
): AsyncIterableIterator<T> {
	if (
		times !== Number.POSITIVE_INFINITY &&
		(!Number.isInteger(times) || times < 0)
	) {
		throw new RangeError(
			"cycleAsync times must be a non-negative integer or Infinity",
		);
	}

	if (times === 0) {
		return;
	}

	const buffer: T[] = [];

	for await (const item of iterable) {
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
