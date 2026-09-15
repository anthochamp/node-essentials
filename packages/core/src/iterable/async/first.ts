import type { DefinedValue } from "../../types/defined-value.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Returns the first element, or `undefined` when the iterable is empty.
 *
 * The async counterpart of `first`. `T` cannot itself include `undefined`, so
 * the absent case is never ambiguous.
 *
 * Time complexity: O(1). The iterator is closed without being drained.
 *
 * @param iterable The iterable to read from, sync or async.
 * @param signal Aborts the read.
 * @returns The first element, or `undefined` if there is none.
 */
export async function firstAsync<T extends DefinedValue>(
	iterable: MaybeAsyncIterable<T>,
	signal?: AbortSignal,
): Promise<T | undefined> {
	signal?.throwIfAborted();

	for await (const item of iterable) {
		return item;
	}

	return undefined;
}
