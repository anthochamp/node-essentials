import type { DefinedValue } from "../../types/defined-value.js";
import type { MaybeAsyncIterable } from "../../types/iterator.js";
import { asyncIteratorOf_ } from "./_async-iterator.js";

/**
 * Returns the single element of an iterable, or `undefined` when it is empty,
 * rejecting any larger count.
 *
 * The async counterpart of `one`, and the tolerant half of the pair `onlyAsync`
 * completes.
 *
 * Time complexity: O(1) — at most two elements are pulled, so this is safe on
 * an endless stream.
 *
 * @param iterable The iterable to read from, sync or async.
 * @param description What the iterable holds, used in the error message.
 * @param signal Aborts the read.
 * @returns The single element, or `undefined` if there is none.
 * @throws {RangeError} If the iterable holds more than one element.
 */
export async function oneAsync<T extends DefinedValue>(
	iterable: MaybeAsyncIterable<T>,
	description = "item",
	signal?: AbortSignal,
): Promise<T | undefined> {
	signal?.throwIfAborted();

	const iterator = asyncIteratorOf_(iterable);
	const first = await iterator.next();

	signal?.throwIfAborted();

	if (first.done === true) {
		return undefined;
	}

	if ((await iterator.next()).done !== true) {
		await iterator.return?.();

		throw new RangeError(`expected at most one ${description}, found more`);
	}

	return first.value;
}
