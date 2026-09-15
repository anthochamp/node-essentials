import { DefinedValue } from "@ac-kit/core";

import { ReplacementPolicy } from "../collection/ireplacing.js";
import { IReplacingMap } from "../map/ireplacing-map.js";
import { LruStore } from "./_lru-store.js";

const NOTHING_DISPLACED: readonly (readonly [never, never])[] = [];

export type LruMapOptions = {
	/** The number of entries held before setting one displaces another. */
	capacity: number;
};

/**
 * A fixed-capacity map that evicts the least recently used entry to make room.
 *
 * The `Map`-shaped counterpart of `LruCache`, over the same engine. **Prefer
 * this one**: a cache almost always has something to say about each key, and a
 * `LruMap<K, undefined>` is the degenerate case `LruCache` covers. Reach for
 * `LruCache` only when the membership itself is the whole answer — a
 * seen-recently set, a dedupe window.
 *
 * `get` counts as a use; `has` and `peek` do not, so an inspection cannot
 * reshuffle the eviction order behind the caller's back. `set` never throws and
 * never blocks: it answers with whatever entry it had to displace. Overwriting
 * a key already held never evicts.
 *
 * Time complexity: O(1) for `get`, `set`, `has`, `peek` and `delete`. Iteration
 * is most-recently-used first, and does not count as a use.
 *
 * Keys are compared by `SameValueZero`, native `Map` semantics.
 *
 * @template K The key type.
 * @template V The value type.
 */
export class LruMap<K, V extends DefinedValue> implements IReplacingMap<K, V> {
	private readonly store: LruStore<K, V>;

	readonly capacity: number;

	/**
	 * Always `"lru"`. A different replacement policy is a different class, the
	 * same way `BoundedQueue`/`LossyQueue` are, never a constructor flag.
	 */
	readonly overflowPolicy: ReplacementPolicy = "lru";

	constructor(
		iterable: Iterable<readonly [K, V]> | undefined,
		options: LruMapOptions,
	) {
		this.capacity = options.capacity;
		this.store = new LruStore<K, V>(options.capacity);

		if (iterable) {
			for (const [key, value] of iterable) {
				this.store.set(key, value);
			}
		}
	}

	/** Most recently used first. Does not count as a use. */
	[Symbol.iterator](): Iterator<readonly [K, V]> {
		return this.store.entries();
	}

	count(): number {
		return this.store.count();
	}

	clear(): void {
		this.store.clear();
	}

	/** O(1). Counts as a use. */
	get(key: K): V | undefined {
		return this.store.get(key);
	}

	/** O(1). Does **not** count as a use, unlike `get`. */
	peek(key: K): V | undefined {
		return this.store.peek(key);
	}

	/**
	 * O(1). Counts as a use.
	 *
	 * @returns The entry evicted to make room, in a one-element array, or an
	 *   empty array if nothing was evicted. Overwriting a held key never evicts.
	 */
	set(key: K, value: V): readonly (readonly [K, V])[] {
		const evicted = this.store.set(key, value);

		return evicted === undefined ? NOTHING_DISPLACED : [evicted];
	}

	/** O(1). Does **not** count as a use. */
	has(key: K): boolean {
		return this.store.has(key);
	}

	/** O(1) — no tombstone, no compaction. */
	delete(key: K): boolean {
		return this.store.delete(key);
	}

	/** Most recently used first. */
	keys(): IterableIterator<K> {
		return this.store.keys();
	}

	/** Most recently used first. */
	values(): IterableIterator<V> {
		return this.store.values();
	}

	/** Most recently used first. */
	entries(): IterableIterator<readonly [K, V]> {
		return this.store.entries();
	}

	/**
	 * The least recently used entry — the one `set` would evict next. O(1). Does
	 * not count as a use.
	 *
	 * @returns The entry, or `undefined` when the map is empty.
	 */
	lru(): readonly [K, V] | undefined {
		return this.store.leastRecent();
	}
}
