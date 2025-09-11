import type { Promisable } from "type-fest";
import type { Predicate } from "../../ecma/function/types.js";
import type { ICollection } from "./icollection.js";

export type PriorityQueueIsHigherPriorityPredicate<P> = Predicate<[P, P]>;

/**
 * Interface representing a priority queue data type.
 *
 * A priority queue is a collection where each item has a priority associated
 * with it. Items with higher priority are served before items with lower priority.
 *
 * @template T The type of elements in the priority queue.
 * @template P The type of priority values.
 */
export interface IPriorityQueue<T = unknown, P = number>
	extends ICollection<[T, P]> {
	/**
	 * Predicate function which determine if one priority is higher than another.
	 */
	readonly isHigherPriority: PriorityQueueIsHigherPriorityPredicate<P>;

	/**
	 * Inserts one or more items with their associated priorities into the priority queue.
	 *
	 * @param priority The priority of the items to insert.
	 * @param items The items to insert.
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the deque's capacity.
	 */
	insert(priority: P, ...items: T[]): Promisable<void>;

	/**
	 * Same as `insert`, but waits for capacity if the operation would exceed it.
	 *
	 * @see IPriorityQueue.insert
	 * @param signal Optional abort signal to cancel the operation.
	 */
	waitInsert(
		priority: P,
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): PromiseLike<void>;

	/**
	 * Removes and returns the item with the highest priority from the priority queue.
	 *
	 * @returns The item with the highest priority, or `undefined` if the queue is empty.
	 */
	extract(): Promisable<T | undefined>;

	/**
	 * Returns the item with the highest priority without removing it from the queue.
	 *
	 * @returns The item with the highest priority, or `undefined` if the queue is empty.
	 */
	peek(): Promisable<T | undefined>;

	/**
	 * Updates the priority of an existing item in the priority queue.
	 *
	 * @param item The item whose priority is to be updated.
	 * @param newPriority The new priority of the item.
	 */
	setPriority(item: T, newPriority: P): Promisable<boolean>;
}
