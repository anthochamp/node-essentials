/** The async-backed sibling of {@link ISubstringIndex}. */
export interface IAsyncSubstringIndex<S> {
	search(needle: S, signal?: AbortSignal): AsyncIterableIterator<number>;
	has(needle: S, signal?: AbortSignal): Promise<boolean>;
}
