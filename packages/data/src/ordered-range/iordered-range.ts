import type { Comparator } from "@ac-kit/core";

/** An entry in a sorted map: a key paired with its value. */
export interface SortedMapEntry<K, V> {
	readonly key: K;
	readonly value: V;
}

/**
 * Ordering operations shared by anything whose iteration order follows a
 * comparator.
 *
 * `T` is what is stored and returned; `Q` is what a query is made with — `Q =
 * T` for a set, `Q = K` (the key) for a map over `T = SortedMapEntry<K, V>`.
 * This is the resolution to "should `ISortedSet`/`ISortedMap` be one
 * parameterised interface": not by one extending the other, but by both
 * composing this shared, query-type-aware mixin.
 *
 * @template T The type returned by `min`/`max`/`floor`/`ceiling`/`range`.
 * @template Q The type a query is made with.
 */
export interface IOrderedRange<T, Q = T> {
	readonly comparator: Comparator<Q>;
	min(): T | undefined;
	max(): T | undefined;
	floor(query: Q): T | undefined;
	ceiling(query: Q): T | undefined;
	range(from?: Q, to?: Q): IterableIterator<T>;
}
