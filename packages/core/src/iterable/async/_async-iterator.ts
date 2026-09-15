import type { MaybeAsyncIterable } from "../../types/iterator.js";

/**
 * Returns whichever iterator an iterable offers, preferring the async one.
 *
 * The result's `next()` may return either a plain `IteratorResult` or a promise
 * for one, so callers must `await` it — awaiting a non-promise is a microtask,
 * not a correctness problem.
 */
export function asyncIteratorOf_<T>(
	iterable: MaybeAsyncIterable<T>,
): AsyncIterator<T> | Iterator<T> {
	return Symbol.asyncIterator in iterable
		? iterable[Symbol.asyncIterator]()
		: iterable[Symbol.iterator]();
}
