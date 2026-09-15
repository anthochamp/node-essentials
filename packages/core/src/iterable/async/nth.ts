import type { DefinedValue } from "../../types/defined-value.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Returns the element at `index`, or `undefined` when the iterable is shorter
 * than that.
 *
 * The async counterpart of `nth`. Only counts forward; a negative index would
 * mean buffering the whole tail, so it is rejected.
 *
 * Time complexity: O(index). The iterator is closed as soon as the element is
 * reached.
 *
 * @param iterable The iterable to read from, sync or async.
 * @param index The zero-based position to read. Must be a non-negative integer.
 * @param signal Aborts the read.
 * @returns The element at `index`, or `undefined` if there is none.
 * @throws {RangeError} If `index` is not a non-negative integer.
 */
export async function nthAsync<T extends DefinedValue>(
	iterable: MaybeAsyncIterable<T>,
	index: number,
	signal?: AbortSignal,
): Promise<T | undefined> {
	if (!Number.isInteger(index) || index < 0) {
		throw new RangeError("nthAsync index must be a non-negative integer");
	}

	signal?.throwIfAborted();

	let position = 0;

	for await (const item of iterable) {
		signal?.throwIfAborted();

		if (position === index) {
			return item;
		}

		position++;
	}

	return undefined;
}
