/** Stabbing queries over a static interval set, keyed by point type `P`. */
export interface IIntervalIndex<P, V> {
	/** Stabbing query: retrieves all intervals containing the given point. */
	stab(point: P): IterableIterator<V>;

	/** Range query: retrieves all intervals overlapping the given range. */
	overlapping(from: P, to: P): IterableIterator<V>;
}
