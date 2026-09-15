import type { MaybeAsyncIterable } from "../types/iterator.js";
import type { Zipped } from "./zip.js";

/** The element type of each iterable in `T`, widened by the fill value. */
export type ZippedLongest<
	T extends readonly MaybeAsyncIterable<unknown>[],
	F,
> = {
	[K in keyof Zipped<T>]: Zipped<T>[K] | F;
};

/**
 * Yields tuples pairing the first element of every iterable, then the second,
 * and so on, continuing until the _longest_ one runs out and substituting
 * `fill` for every iterable that has already ended.
 *
 * The counterpart of `zip`, which stops at the shortest instead.
 *
 * Every source iterator is closed when iteration ends, whether it ended by
 * exhaustion or because the consumer stopped pulling.
 *
 * Time complexity: O(1) per tuple, allocating one tuple per yield.
 *
 * @param iterables The iterables to advance in lockstep.
 * @param fill The value standing in for an iterable that has already ended.
 * @returns An iterator over the tuples. Empty when no iterables were given.
 */
export function* zipLongest<const T extends readonly Iterable<unknown>[], F>(
	iterables: T,
	fill: F,
): IterableIterator<ZippedLongest<T, F>> {
	if (iterables.length === 0) {
		return;
	}

	const iterators = iterables.map((iterable) => iterable[Symbol.iterator]());
	const exhausted = Array.from<boolean>({ length: iterators.length }).fill(
		false,
	);
	let remaining = iterators.length;

	try {
		while (true) {
			const values: unknown[] = [];

			for (let index = 0; index < iterators.length; index++) {
				if (exhausted[index] === true) {
					values.push(fill);
					continue;
				}

				const result = iterators[index]!.next();

				if (result.done === true) {
					exhausted[index] = true;
					remaining--;
					values.push(fill);
					continue;
				}

				values.push(result.value);
			}

			if (remaining === 0) {
				return;
			}

			// Safe: one value was pushed per iterable, in order, so the array has
			// exactly the arity and element types `ZippedLongest<T, F>` describes.
			yield values as ZippedLongest<T, F>;
		}
	} finally {
		for (const iterator of iterators) {
			iterator.return?.();
		}
	}
}
