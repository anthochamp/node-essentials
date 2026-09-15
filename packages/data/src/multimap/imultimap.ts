import type { ICollection } from "../collection/icollection.js";

/**
 * A key-to-many-values association.
 *
 * `count()` (inherited from {@link ICollection}) is the total number of `(key,
 * value)` entries across every key — a key with three values contributes three
 * to `count()`, not one. `keyCount()` is the number of distinct keys, and
 * `keys()` yields each of them once (a "key set", not a `(key, value)`
 * count-many repetition).
 */
export interface IMultimap<K, V> extends ICollection<readonly [K, V]> {
	get(key: K): IterableIterator<V>;
	add(key: K, value: V): void;

	/**
	 * Takes an `Iterable` so another key's values can be added without
	 * materialising them.
	 */
	addAll(key: K, values: Iterable<V>): void;

	has(key: K): boolean;
	hasEntry(key: K, value: V): boolean;
	delete(key: K): number;
	deleteEntry(key: K, value: V): boolean;
	countFor(key: K): number;
	keyCount(): number;
	keys(): IterableIterator<K>;
	entries(): IterableIterator<readonly [K, V]>;
}
