import type { Promisable } from "type-fest";
import type { ICollection } from "./icollection.js";

/**
 * Interface representing a double-ended queue (deque) data type.
 *
 * A deque is a generalized version of a queue that allows insertion and removal
 * of items from both ends.
 *
 * @template T The type of elements in the deque.
 */
export interface IDeque<T = unknown> extends ICollection<T> {
	/**
	 * Adds one or more items to the front of the deque.
	 *
	 * The items are added in the order they are provided, with the last item
	 * in the argument list becoming the new front of the deque.
	 *
	 * @param items The items to add to the front of the deque.
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the deque's capacity.
	 */
	unshift(...items: T[]): Promisable<void>;

	/**
	 * Same as `unshift`, but waits for capacity if the operation would exceed it.
	 *
	 * @see IDeque.unshift
	 * @param signal Optional abort signal to cancel the operation.
	 */
	waitUnshift(
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): PromiseLike<void>;

	/**
	 * Adds one or more items to the back of the deque.
	 *
	 * The items are added in the order they are provided, with the last item
	 * in the argument list becoming the new back of the deque.
	 *
	 * @param items The items to add to the back of the deque.
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the deque's capacity.
	 */
	push(...items: T[]): Promisable<void>;

	/**
	 * Same as `push`, but waits for capacity if the operation would exceed it.
	 *
	 * @see IDeque.push
	 * @param signal Optional abort signal to cancel the operation.
	 */
	waitPush(items: Iterable<T>, signal?: AbortSignal | null): PromiseLike<void>;

	/**
	 * Removes and returns the item at the front of the deque.
	 *
	 * @returns The item at the front of the deque, or `undefined` if the deque is empty.
	 */
	shift(): Promisable<T | undefined>;

	/**
	 * Removes and returns the item at the back of the deque.
	 *
	 * @return The item at the back of the deque, or `undefined` if the deque is empty.
	 */
	pop(): Promisable<T | undefined>;

	/**
	 * Returns the item at the front of the deque without removing it.
	 *
	 * @returns The item at the front of the deque, or `undefined` if the deque is empty.
	 */
	front(): Promisable<T | undefined>;

	/**
	 * Returns the item at the back of the deque without removing it.
	 *
	 * @returns The item at the back of the deque, or `undefined` if the deque is empty.
	 */
	back(): Promisable<T | undefined>;
}
