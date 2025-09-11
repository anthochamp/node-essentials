export type MaybeAsyncIterableIterator<T> =
	| IterableIterator<T>
	| AsyncIterableIterator<T>;
