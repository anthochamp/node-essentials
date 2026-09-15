import type { MaybeAsyncIterable } from "../../types/iterator.js";
import type { ZippedLongest } from "../zip-longest.js";
import { asyncIteratorOf_ } from "./_async-iterator.js";

/**
 * Yields tuples pairing the first element of every iterable, then the second,
 * and so on, continuing until the _longest_ one runs out and substituting
 * `fill` for every iterable that has already ended.
 *
 * The async counterpart of `zipLongest`. Each round advances every unexhausted
 * source concurrently.
 *
 * Time complexity: O(1) per tuple, allocating one tuple per yield.
 *
 * @param iterables The iterables to advance in lockstep.
 * @param fill The value standing in for an iterable that has already ended.
 * @returns An iterator over the tuples. Empty when no iterables were given.
 */
export async function* zipLongestAsync<
	const T extends readonly MaybeAsyncIterable<unknown>[],
	F,
>(iterables: T, fill: F): AsyncIterableIterator<ZippedLongest<T, F>> {
	if (iterables.length === 0) {
		return;
	}

	const iterators = iterables.map((iterable) => asyncIteratorOf_(iterable));
	const exhausted = Array.from<boolean>({ length: iterators.length }).fill(
		false,
	);
	let remaining = iterators.length;

	try {
		while (true) {
			// `Promise.resolve` rather than an `async` wrapper: a sync source's
			// `next()` returns a plain result, and wrapping costs an extra tick.
			const results = await Promise.all(
				iterators.map((iterator, index) =>
					Promise.resolve(
						exhausted[index] === true ? undefined : iterator.next(),
					),
				),
			);

			const values = results.map((result, index) => {
				if (result === undefined) {
					return fill;
				}

				if (result.done === true) {
					exhausted[index] = true;
					remaining--;
					return fill;
				}

				return result.value;
			});

			if (remaining === 0) {
				return;
			}

			// Safe: one value per iterable, in order, so the array has exactly the
			// arity and element types `ZippedLongest<T, F>` describes.
			yield values as ZippedLongest<T, F>;
		}
	} finally {
		// Cleanup: every source must be closed even if one `return` rejects.
		await Promise.allSettled(
			iterators.map((iterator) => Promise.resolve(iterator.return?.())),
		);
	}
}
