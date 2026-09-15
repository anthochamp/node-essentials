/** Nearest-neighbour search under an arbitrary metric. */
export interface ISimilarityIndex<T> {
	add(item: T): void;
	addAll(items: Iterable<T>): void;
	nearest(query: T, count: number): IterableIterator<readonly [T, number]>;
	within(query: T, maxDistance: number): IterableIterator<readonly [T, number]>;
}
