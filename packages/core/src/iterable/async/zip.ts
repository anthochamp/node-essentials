import type { MaybeAsyncIterable } from "../../types/iterator.js";
import type { Zipped } from "../zip.js";
import { asyncIteratorOf_ } from "./_async-iterator.js";

/**
 * Yields tuples pairing the first element of every iterable, then the second,
 * and so on, stopping as soon as any one of them runs out.
 *
 * The async counterpart of `zip`. Sources may be mixed, so a materialised array
 * can be paired with a stream. Each round advances every source concurrently
 * rather than one after another, so a round costs the slowest source, not their
 * sum.
 *
 * Every source iterator is closed when iteration ends, whether it ended by
 * exhaustion or because the consumer stopped pulling.
 *
 * Time complexity: O(1) per tuple, allocating one tuple per yield.
 *
 * @param iterables The iterables to advance in lockstep.
 * @returns An iterator over the tuples. Empty when no iterables were given.
 */
export async function* zipAsync<
	const T extends readonly MaybeAsyncIterable<unknown>[],
>(iterables: T): AsyncIterableIterator<Zipped<T>> {
	if (iterables.length === 0) {
		return;
	}

	const iterators = iterables.map((iterable) => asyncIteratorOf_(iterable));

	try {
		while (true) {
			// `Promise.resolve` rather than an `async` wrapper: a sync source's
			// `next()` returns a plain result, and wrapping costs an extra tick.
			const results = await Promise.all(
				iterators.map((iterator) => Promise.resolve(iterator.next())),
			);

			if (results.some((result) => result.done === true)) {
				return;
			}

			// Safe: one result per iterable, in order, so the mapped array has
			// exactly the arity and element types `Zipped<T>` describes.
			yield results.map((result) => result.value) as Zipped<T>;
		}
	} finally {
		// Cleanup: every source must be closed even if one `return` rejects.
		await Promise.allSettled(
			iterators.map((iterator) => Promise.resolve(iterator.return?.())),
		);
	}
}
