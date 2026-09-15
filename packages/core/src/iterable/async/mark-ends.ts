import type { MaybeAsyncIterable } from "../../types/iterator.js";
import type { MarkedEnd } from "../mark-ends.js";
import { asyncIteratorOf_ } from "./_async-iterator.js";

/**
 * Yields each element tagged with whether it is the first and whether it is the
 * last.
 *
 * The async counterpart of `markEnds`. Knowing an element is the last one
 * requires a one-element lookahead, so the source always runs one step ahead of
 * what has been yielded — on a slow stream that means one extra pending read at
 * all times.
 *
 * Time complexity: O(1) per element, allocating one tuple per yield.
 *
 * @param iterable The input iterable, sync or async.
 * @returns An iterator over the tagged elements.
 */
export async function* markEndsAsync<T>(
	iterable: MaybeAsyncIterable<T>,
): AsyncIterableIterator<MarkedEnd<T>> {
	const iterator = asyncIteratorOf_(iterable);
	let current = await iterator.next();

	if (current.done === true) {
		return;
	}

	let isFirst = true;

	while (true) {
		const next = await iterator.next();

		yield [current.value, isFirst, next.done === true];

		if (next.done === true) {
			return;
		}

		current = next;
		isFirst = false;
	}
}
