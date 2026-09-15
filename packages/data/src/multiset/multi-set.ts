import type { DefinedValue } from "@ac-kit/core";

import type { IMultiset } from "./imultiset.js";

/**
 * A bag: a set that counts how many times each distinct item was added.
 *
 * Backed by a `Map` from item to multiplicity, so adding the same item a
 * million times costs one entry rather than a million. `count()` is the total
 * including multiplicities; `distinctCount()` is the number of `Map` entries.
 *
 * Time complexity: O(1) for `add`, `delete`, `has`, `multiplicity`,
 * `distinctCount` and `count`. Iterating with `[Symbol.iterator]` yields each
 * item as many times as it was added, so it is O(count()); `distinct()` and
 * `entries()` are O(distinctCount()).
 *
 * Items are compared by `SameValueZero`, native `Map` semantics.
 *
 * @template T The type of items. Anything except `undefined`.
 */
export class MultiSet<T extends DefinedValue> implements IMultiset<T> {
	private readonly counts = new Map<T, number>();

	/** Maintained incrementally: summing the multiplicities would be O(n). */
	private size = 0;

	constructor(iterable?: Iterable<T>) {
		if (iterable) {
			this.addAll(iterable);
		}
	}

	/** Each item repeated as many times as it is held. */
	*[Symbol.iterator](): Iterator<T> {
		for (const [item, multiplicity] of this.counts) {
			for (let repeat = 0; repeat < multiplicity; repeat++) {
				yield item;
			}
		}
	}

	/** The total including multiplicities. O(1). */
	count(): number {
		return this.size;
	}

	clear(): void {
		this.counts.clear();
		this.size = 0;
	}

	/**
	 * Adds `times` occurrences of `item`. O(1).
	 *
	 * @param times How many to add. Defaults to `1`. Adding `0` is a no-op and
	 *   does not make the item present.
	 * @throws {RangeError} If `times` is negative or not an integer — use
	 *   `delete` to remove.
	 */
	add(item: T, times = 1): void {
		this.requireCount(times);

		if (times === 0) {
			return;
		}

		this.counts.set(item, (this.counts.get(item) ?? 0) + times);
		this.size += times;
	}

	/**
	 * Adds `times` occurrences of each item. O(m) in the number of items.
	 *
	 * @param times How many of _each_ item to add. Defaults to `1`.
	 * @throws {RangeError} If `times` is negative or not an integer.
	 */
	addAll(items: Iterable<T>, times = 1): void {
		this.requireCount(times);

		if (times === 0) {
			return;
		}

		for (const item of items) {
			this.counts.set(item, (this.counts.get(item) ?? 0) + times);
			this.size += times;
		}
	}

	/**
	 * Removes up to `times` occurrences of `item`. O(1).
	 *
	 * @param times How many to remove. Defaults to `1`. Removing more than are
	 *   held removes all of them rather than throwing.
	 * @returns How many were actually removed.
	 * @throws {RangeError} If `times` is negative or not an integer.
	 */
	delete(item: T, times = 1): number {
		this.requireCount(times);

		const held = this.counts.get(item);

		if (held === undefined || times === 0) {
			return 0;
		}

		const removed = Math.min(held, times);

		if (removed === held) {
			this.counts.delete(item);
		} else {
			this.counts.set(item, held - removed);
		}

		this.size -= removed;

		return removed;
	}

	/** O(1). */
	has(item: T): boolean {
		return this.counts.has(item);
	}

	/** How many times `item` is held; `0` when absent. O(1). */
	multiplicity(item: T): number {
		return this.counts.get(item) ?? 0;
	}

	/** The number of distinct items, ignoring multiplicities. O(1). */
	distinctCount(): number {
		return this.counts.size;
	}

	/** Each distinct item once, in first-insertion order. */
	distinct(): IterableIterator<T> {
		return this.counts.keys();
	}

	/** Each distinct item paired with its multiplicity. */
	entries(): IterableIterator<readonly [T, number]> {
		return this.counts.entries();
	}

	private requireCount(times: number): void {
		if (!Number.isInteger(times) || times < 0) {
			throw new RangeError(
				`Occurrence count must be a non-negative integer, got ${times}`,
			);
		}
	}
}
