export type MaybeAsyncIterableIterator<T> =
	| IterableIterator<T>
	| AsyncIterableIterator<T>;

/**
 * An iterable that may or may not need awaiting between elements.
 *
 * The input type of every `*Async` iterable helper, so a caller can mix
 * already-materialised sources with streamed ones — `zipAsync([1, 2, 3],
 * stream)` — without wrapping the former.
 */
export type MaybeAsyncIterable<T> = Iterable<T> | AsyncIterable<T>;
