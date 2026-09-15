import { DefinedValue } from "@ac-kit/core";

import { ICollection } from "../collection/icollection.js";

/**
 * A key-to-value association.
 *
 * `count()` (inherited from {@link ICollection}) is the number of entries, which
 * for a map is the same number as the number of keys — a map cannot hold two
 * entries for one key by definition, so no separate `keyCount()` is needed here
 * (unlike {@link IMultimap}, where it can differ).
 */
export interface IMap<K, V extends DefinedValue> extends ICollection<
	readonly [K, V]
> {
	get(key: K): V | undefined;
	set(key: K, value: V): void;
	has(key: K): boolean;
	delete(key: K): boolean;
	keys(): IterableIterator<K>;
	values(): IterableIterator<V>;
	entries(): IterableIterator<readonly [K, V]>;
}
