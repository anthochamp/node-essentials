import type { MaybeAsyncIterable } from "../../types/iterator.js";
import { asyncIteratorOf_ } from "./_async-iterator.js";

/**
 * Counts the elements of an iterable, consuming it.
 *
 * The async counterpart of `count`, without its O(1) fast paths: a stream has
 * no size to read.
 *
 * Time complexity: O(n).
 *
 * @param iterable The iterable to count, sync or async.
 * @param signal Aborts the count.
 * @returns How many elements it yielded.
 */
export async function countAsync(
	iterable: MaybeAsyncIterable<unknown>,
	signal?: AbortSignal,
): Promise<number> {
	signal?.throwIfAborted();

	const iterator = asyncIteratorOf_(iterable);
	let total = 0;

	while ((await iterator.next()).done !== true) {
		signal?.throwIfAborted();
		total++;
	}

	return total;
}
