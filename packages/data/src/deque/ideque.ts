import type { DefinedValue } from "@ac-kit/core";

import { ICollection } from "../collection/icollection.js";

/**
 * Interface representing a double-ended queue (deque) data type.
 *
 * A deque is a generalized version of a queue that allows insertion and removal
 * of items from both ends.
 *
 * @template T The type of elements in the deque. Anything except `undefined`,
 *   which means "no element".
 */
export interface IDeque<
	T extends DefinedValue = DefinedValue,
> extends ICollection<T> {
	/**
	 * Adds an item to the front of the deque.
	 *
	 * @param item The item to add to the front of the deque.
	 */
	unshift(item: T): void;

	/**
	 * Adds every item to the front of the deque.
	 *
	 * The items keep their relative order, so the _first_ element of the array
	 * becomes the new front — `Array.prototype.unshift` semantics.
	 *
	 * @param items The items to add to the front of the deque.
	 */
	unshiftAll(items: readonly T[]): void;

	/**
	 * Adds an item to the back of the deque.
	 *
	 * @param item The item to add to the back of the deque.
	 */
	push(item: T): void;

	/**
	 * Adds every item to the back of the deque.
	 *
	 * The items keep their relative order, so the last element of the array
	 * becomes the new back — `Array.prototype.push` semantics.
	 *
	 * @param items The items to add to the back of the deque.
	 */
	pushAll(items: readonly T[]): void;

	/**
	 * Removes and returns the item at the front of the deque.
	 *
	 * @returns The item at the front of the deque, or `undefined` if the deque is
	 *   empty.
	 */
	shift(): T | undefined;

	/**
	 * Removes and returns the item at the back of the deque.
	 *
	 * @returns The item at the back of the deque, or `undefined` if the deque is
	 *   empty.
	 */
	pop(): T | undefined;

	/**
	 * Returns the item at the front of the deque without removing it.
	 *
	 * @returns The item at the front of the deque, or `undefined` if the deque is
	 *   empty.
	 */
	front(): T | undefined;

	/**
	 * Returns the item at the back of the deque without removing it.
	 *
	 * @returns The item at the back of the deque, or `undefined` if the deque is
	 *   empty.
	 */
	back(): T | undefined;
}
