import type { ICollection } from "../collection/icollection.js";

/**
 * A collection that tracks how many times each distinct item was added.
 *
 * `count()` (inherited from {@link ICollection}) is the total including
 * multiplicities; the per-item count is {@link IMultiset.multiplicity}.
 */
export interface IMultiset<T> extends ICollection<T> {
	add(item: T, times?: number): void;

	/**
	 * Adds each item of `items` `times` times. Takes an `Iterable`; never reads a
	 * length.
	 */
	addAll(items: Iterable<T>, times?: number): void;

	delete(item: T, times?: number): number;
	has(item: T): boolean;
	multiplicity(item: T): number;
	distinctCount(): number;
	distinct(): IterableIterator<T>;
	entries(): IterableIterator<readonly [T, number]>;
}
