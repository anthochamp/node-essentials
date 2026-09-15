/** The async-backed sibling of {@link ISimilarityIndex}. */
export interface IAsyncSimilarityIndex<T> {
	add(item: T, signal?: AbortSignal): Promise<void>;
	addAll(items: Iterable<T>, signal?: AbortSignal): Promise<void>;
	nearest(
		query: T,
		count: number,
		signal?: AbortSignal,
	): AsyncIterableIterator<readonly [T, number]>;
	within(
		query: T,
		maxDistance: number,
		signal?: AbortSignal,
	): AsyncIterableIterator<readonly [T, number]>;
}
