/** The async-backed sibling of {@link IIntervalIndex}. */
export interface IAsyncIntervalIndex<P, V> {
	/** Stabbing query: retrieves all intervals containing the given point. */
	stab(point: P, signal?: AbortSignal): AsyncIterableIterator<V>;

	/** Range query: retrieves all intervals overlapping the given range. */
	overlapping(from: P, to: P, signal?: AbortSignal): AsyncIterableIterator<V>;
}
