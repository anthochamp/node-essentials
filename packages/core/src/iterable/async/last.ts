import type { DefinedValue } from "../../types/defined-value.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Returns the last element, or `undefined` when the iterable is empty.
 *
 * The async counterpart of `last`, without its array fast path: an async source
 * has no length to index into, so the whole of it is drained.
 *
 * Time complexity: O(n).
 *
 * @param iterable The iterable to read from, sync or async.
 * @param signal Aborts the drain.
 * @returns The last element, or `undefined` if there is none.
 */
export async function lastAsync<T extends DefinedValue>(
	iterable: MaybeAsyncIterable<T>,
	signal?: AbortSignal,
): Promise<T | undefined> {
	signal?.throwIfAborted();

	let result: T | undefined;

	for await (const item of iterable) {
		signal?.throwIfAborted();
		result = item;
	}

	return result;
}
