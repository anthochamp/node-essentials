import type { MaybeAsyncIterable } from "../../types/iterator.js";
import { asyncIteratorOf_ } from "./_async-iterator.js";

/**
 * Returns the single element of an iterable, rejecting any other count.
 *
 * The async counterpart of `only`. Use `oneAsync` where an empty iterable is
 * acceptable.
 *
 * Time complexity: O(1) — at most two elements are pulled, so this is safe on
 * an endless stream.
 *
 * @param iterable The iterable to read from, sync or async.
 * @param description What the iterable holds, used in the error message.
 * @param signal Aborts the read.
 * @returns The single element.
 * @throws {RangeError} If the iterable is empty or holds more than one element.
 */
export async function onlyAsync<T>(
	iterable: MaybeAsyncIterable<T>,
	description = "item",
	signal?: AbortSignal,
): Promise<T> {
	signal?.throwIfAborted();

	const iterator = asyncIteratorOf_(iterable);
	const first = await iterator.next();

	signal?.throwIfAborted();

	if (first.done === true) {
		throw new RangeError(`expected exactly one ${description}, found none`);
	}

	if ((await iterator.next()).done !== true) {
		await iterator.return?.();

		throw new RangeError(`expected exactly one ${description}, found more`);
	}

	return first.value;
}
