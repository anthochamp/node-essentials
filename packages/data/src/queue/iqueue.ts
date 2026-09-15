import type { DefinedValue } from "@ac-kit/core";

import { ICollection } from "../collection/icollection.js";

/**
 * Interface representing a FIFO (First In First Out) queue.
 *
 * A queue is a collection that follows the First In First Out (FIFO) principle,
 * where the first item added to the queue is the first one to be removed.
 *
 * @template T The type of elements in the queue. Anything except `undefined`,
 *   which means "no element".
 */
export interface IQueue<
	T extends DefinedValue = DefinedValue,
> extends ICollection<T> {
	/**
	 * Adds an item to the rear of the queue.
	 *
	 * @param item The item to add to the queue.
	 */
	enqueue(item: T): void;

	/**
	 * Adds every item to the rear of the queue, in array order, so the last one
	 * is the last to be dequeued.
	 *
	 * @param items The items to add to the queue.
	 */
	enqueueAll(items: readonly T[]): void;

	/**
	 * Removes and returns the item at the front of the queue.
	 *
	 * @returns The item at the front of the queue, or `undefined` if the queue is
	 *   empty.
	 */
	dequeue(): T | undefined;

	/**
	 * Returns the item at the front of the queue without removing it.
	 *
	 * @returns The item at the front of the queue, or `undefined` if the queue is
	 *   empty.
	 */
	front(): T | undefined;
}
