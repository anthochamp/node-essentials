import type { Promisable } from "type-fest";
import type { ICollection } from "./icollection.js";

/**
 * Interface representing a stack data type
 *
 * A stack is a collection that follows the Last In First Out (LIFO) principle,
 * where the last item added to the stack is the first one to be removed.
 *
 * @template T The type of elements in the stack.
 */
export interface IStack<T = unknown> extends ICollection<T> {
	/**
	 * Adds one or more items to the top of the stack.
	 *
	 * The items are added in the order they are provided. The last item in the
	 * argument list will be the first one to be popped.
	 *
	 * @param items The items to add to the stack.
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the stack's capacity.
	 */
	push(...items: T[]): Promisable<void>;

	/**
	 * Same as `push`, but waits for capacity if the operation would exceed it.
	 *
	 * @see IStack.push
	 * @param signal Optional abort signal to cancel the operation.
	 */
	waitPush(items: Iterable<T>, signal?: AbortSignal | null): PromiseLike<void>;

	/**
	 * Removes and returns the item at the top of the stack.
	 *
	 * @returns The item at the top of the stack, or `undefined` if the stack is empty.
	 */
	pop(): Promisable<T | undefined>;

	/**
	 * Returns the item at the top of the stack without removing it.
	 *
	 * @returns The item at the top of the stack, or `undefined` if the stack is empty.
	 */
	top(): Promisable<T | undefined>;
}
