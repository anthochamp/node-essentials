import type { DefinedValue } from "@ac-kit/core";

import { ReplacementPolicy } from "../collection/ireplacing.js";
import { EnhancedSet } from "../set/enhanced-set.js";
import { IReplacingSet } from "../set/ireplacing-set.js";
import { ISet } from "../set/iset.js";
import { LruStore } from "./_lru-store.js";

const NOTHING_DISPLACED: readonly never[] = [];

export type LruCacheOptions = {
	/** The number of items held before adding one displaces another. */
	capacity: number;
};

/**
 * A fixed-capacity set that evicts the least recently used item to make room.
 *
 * `add` never throws and never blocks: it answers with whatever it had to
 * displace, so a caller that needs to know what fell out can see it without
 * tracking the size itself. `has` deliberately does **not** count as a use —
 * only `add` and `touch` do — so a membership test cannot reshuffle the
 * eviction order behind the caller's back.
 *
 * Time complexity: O(1) for `add`, `has`, `touch` and `delete`. The inherited
 * set algebra is O(n·m), as on `EnhancedSet`, and returns an unbounded
 * `EnhancedSet` rather than another cache — a capacity-bounded union would
 * silently drop elements it was asked to combine.
 *
 * Items are compared by `SameValueZero`, native `Map` semantics. An arbitrary
 * equality cannot be hashed, and a cache exists to be fast; use `EnhancedSet`
 * when the equality matters more than the speed.
 *
 * @template T The type of items. Anything except `undefined`.
 */
export class LruCache<T extends DefinedValue> implements IReplacingSet<T> {
	private readonly store: LruStore<T, T>;

	readonly capacity: number;

	/**
	 * Always `"lru"`. A different replacement policy is a different class, the
	 * same way `BoundedQueue`/`LossyQueue` are, never a constructor flag.
	 */
	readonly overflowPolicy: ReplacementPolicy = "lru";

	constructor(iterable: Iterable<T> | undefined, options: LruCacheOptions) {
		this.capacity = options.capacity;
		this.store = new LruStore<T, T>(options.capacity);

		if (iterable) {
			this.addAll(iterable);
		}
	}

	/** Most recently used first. */
	[Symbol.iterator](): Iterator<T> {
		return this.store.keys();
	}

	count(): number {
		return this.store.count();
	}

	clear(): void {
		this.store.clear();
	}

	/**
	 * O(1). Counts as a use, so re-adding a held item makes it the most recently
	 * used rather than doing nothing.
	 *
	 * @returns The item evicted to make room, in a one-element array, or an empty
	 *   array if nothing was evicted.
	 */
	add(item: T): readonly T[] {
		const evicted = this.store.set(item, item);

		return evicted === undefined ? NOTHING_DISPLACED : [evicted[1]];
	}

	/**
	 * O(n) in the number of items. Every eviction along the way is reported, in
	 * the order it happened — adding more items than the capacity evicts the
	 * earlier ones of the same batch.
	 */
	addAll(items: Iterable<T>): readonly T[] {
		let evicted: T[] | undefined;

		for (const item of items) {
			const dropped = this.store.set(item, item);

			if (dropped !== undefined) {
				(evicted ??= []).push(dropped[1]);
			}
		}

		return evicted ?? NOTHING_DISPLACED;
	}

	/** O(1). */
	delete(item: T): boolean {
		return this.store.delete(item);
	}

	/** O(1). Does **not** count as a use — see `touch`. */
	has(item: T): boolean {
		return this.store.has(item);
	}

	/**
	 * Marks a held item as the most recently used. O(1).
	 *
	 * @returns `true` if the item was held, `false` if it was not (in which case
	 *   nothing changed — use `add` to insert it).
	 */
	touch(item: T): boolean {
		return this.store.get(item) !== undefined;
	}

	/**
	 * The least recently used item — the one `add` would evict next. O(1). Does
	 * not count as a use.
	 *
	 * @returns The item, or `undefined` when the cache is empty.
	 */
	lru(): T | undefined {
		return this.store.leastRecent()?.[1];
	}

	/** O(n·m). Returns an unbounded set: see the note on this class. */
	union(other: Iterable<T>): ISet<T> {
		return this.toSet().union(other);
	}

	/** O(n·m). Returns an unbounded set: see the note on this class. */
	intersection(other: Iterable<T>): ISet<T> {
		return this.toSet().intersection(other);
	}

	/** O(n·m). Returns an unbounded set: see the note on this class. */
	difference(other: Iterable<T>): ISet<T> {
		return this.toSet().difference(other);
	}

	/** O(n·m). Returns an unbounded set: see the note on this class. */
	symmetricDifference(other: Iterable<T>): ISet<T> {
		return this.toSet().symmetricDifference(other);
	}

	/** O(n·m). */
	isSubsetOf(other: Iterable<T>): boolean {
		return this.toSet().isSubsetOf(other);
	}

	/** O(m). */
	isSupersetOf(other: Iterable<T>): boolean {
		for (const item of other) {
			if (!this.store.has(item)) {
				return false;
			}
		}

		return true;
	}

	/** O(m). */
	isDisjointFrom(other: Iterable<T>): boolean {
		for (const item of other) {
			if (this.store.has(item)) {
				return false;
			}
		}

		return true;
	}

	private toSet(): EnhancedSet<T> {
		return new EnhancedSet<T>(this.store.keys());
	}
}
