import type { DefinedValue, OrderPredicate } from "@ac-kit/core";

import { ICollection } from "../collection/icollection.js";

/** A value paired with the priority it was inserted with. */
export interface PriorityEntry<T, P> {
	readonly value: T;
	readonly priority: P;
}

/**
 * Interface representing a priority queue data type.
 *
 * A priority queue is a collection where each item has a priority associated
 * with it. Items with higher priority are served before items with lower
 * priority.
 *
 * `ICollection<T>`, not `ICollection<[T, P]>` — the priority is part of the
 * ordering, not of the element type. Iteration order is heap order, not
 * priority order; `entries()` is the priority-ordered, priority-carrying read.
 *
 * @template T The type of elements in the priority queue. Anything except
 *   `undefined`, which means "no element".
 * @template P The type of priority values.
 */
export interface IPriorityQueue<
	T extends DefinedValue = DefinedValue,
	P = number,
> extends ICollection<T> {
	/**
	 * Strict weak ordering over priorities: `precedes(a, b)` means `a` outranks
	 * `b`.
	 */
	readonly precedes: OrderPredicate<P>;

	/**
	 * Inserts an item with its associated priority into the priority queue.
	 *
	 * @param priority The priority of the item to insert.
	 * @param item The item to insert.
	 */
	insert(priority: P, item: T): void;

	/**
	 * Inserts every item at the same priority into the priority queue.
	 *
	 * @param priority The priority shared by all the items to insert.
	 * @param items The items to insert.
	 */
	insertAll(priority: P, items: readonly T[]): void;

	/**
	 * Removes and returns the item with the highest priority from the priority
	 * queue.
	 *
	 * @returns The item with the highest priority, or `undefined` if the queue is
	 *   empty.
	 */
	extract(): T | undefined;

	/**
	 * Returns the item with the highest priority without removing it from the
	 * queue.
	 *
	 * @returns The item with the highest priority, or `undefined` if the queue is
	 *   empty.
	 */
	peek(): T | undefined;

	/**
	 * Updates the priority of an existing item in the priority queue.
	 *
	 * @param item The item whose priority is to be updated.
	 * @param priority The new priority of the item.
	 * @returns `true` if the item was found and its priority updated, `false`
	 *   otherwise.
	 */
	setPriority(item: T, priority: P): boolean;

	/** Every entry, in priority order (highest first). */
	entries(): IterableIterator<PriorityEntry<T, P>>;
}
