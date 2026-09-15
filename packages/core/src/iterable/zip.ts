import type { MaybeAsyncIterable } from "../types/iterator.js";

/**
 * The element type of each iterable in `T`, as a tuple in the same order.
 *
 * Accepts async iterables so `zip` and `zipAsync` share one definition.
 */
export type Zipped<T extends readonly MaybeAsyncIterable<unknown>[]> = {
	[K in keyof T]: T[K] extends Iterable<infer U>
		? U
		: T[K] extends AsyncIterable<infer U>
			? U
			: never;
};

/**
 * Yields tuples pairing the first element of every iterable, then the second,
 * and so on, stopping as soon as any one of them runs out.
 *
 * Takes one array rather than a rest parameter, unlike `concat`: the two shapes
 * cannot be told apart, because an `Iterable<T>` is very often an array
 * itself.
 *
 * Every source iterator is closed when iteration ends, whether it ended by
 * exhaustion or because the consumer stopped pulling.
 *
 * Time complexity: O(1) per tuple, allocating one tuple per yield.
 *
 * @param iterables The iterables to advance in lockstep.
 * @returns An iterator over the tuples. Empty when no iterables were given.
 */
export function* zip<const T extends readonly Iterable<unknown>[]>(
	iterables: T,
): IterableIterator<Zipped<T>> {
	if (iterables.length === 0) {
		return;
	}

	const iterators = iterables.map((iterable) => iterable[Symbol.iterator]());

	try {
		while (true) {
			const values: unknown[] = [];

			for (let index = 0; index < iterators.length; index++) {
				const result = iterators[index]!.next();

				if (result.done === true) {
					return;
				}

				values.push(result.value);
			}

			// Safe: one value was pushed per iterable, in order, so the array has
			// exactly the arity and element types `Zipped<T>` describes.
			yield values as Zipped<T>;
		}
	} finally {
		for (const iterator of iterators) {
			iterator.return?.();
		}
	}
}
