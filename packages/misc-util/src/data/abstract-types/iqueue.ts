import type { Promisable } from "type-fest";
import type { ICollection } from "./icollection.js";

/**
 * Interface representing a FIFO (First In First Out) queue.
 *
 * A queue is a collection that follows the First In First Out (FIFO) principle,
 * where the first item added to the queue is the first one to be removed.
 *
 * @template T The type of elements in the queue.
 */
export interface IQueue<T = unknown> extends ICollection<T> {
	/**
	 * Adds one or more items to the rear of the queue.
	 *
	 * The items are added in the order they are provided. The last item in the
	 * argument list will be the last one to be dequeued.
	 *
	 * @param items The items to add to the queue.
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the queue's capacity.
	 */
	enqueue(...items: T[]): Promisable<void>;

	/**
	 * Same as `enqueue`, but waits for capacity if the operation would exceed it.
	 *
	 * @see IQueue.enqueue
	 * @param signal Optional abort signal to cancel the operation.
	 */
	waitEnqueue(
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): PromiseLike<void>;

	/**
	 * Removes and returns the item at the front of the queue.
	 *
	 * @returns The item at the front of the queue, or `undefined` if the queue is empty.
	 * @param signal Optional AbortSignal to cancel the operation.
	 */
	dequeue(): Promisable<T | undefined>;

	/**
	 * Returns the item at the front of the queue without removing it.
	 *
	 * @returns The item at the front of the queue, or `undefined` if the queue is empty.
	 * @param signal Optional AbortSignal to cancel the operation.
	 */
	front(): Promisable<T | undefined>;
}
