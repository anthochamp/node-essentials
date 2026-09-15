import type { DefinedValue } from "@ac-kit/core";

import { ICollection } from "../collection/icollection.js";

/**
 * Interface representing a stack data type
 *
 * A stack is a collection that follows the Last In First Out (LIFO) principle,
 * where the last item added to the stack is the first one to be removed.
 *
 * @template T The type of elements in the stack. Anything except `undefined`,
 *   which means "no element".
 */
export interface IStack<
	T extends DefinedValue = DefinedValue,
> extends ICollection<T> {
	/**
	 * Adds an item to the top of the stack.
	 *
	 * @param item The item to add to the stack.
	 */
	push(item: T): void;

	/**
	 * Adds every item to the top of the stack, in array order, so the last one is
	 * the first to be popped.
	 *
	 * @param items The items to add to the stack.
	 */
	pushAll(items: readonly T[]): void;

	/**
	 * Removes and returns the item at the top of the stack.
	 *
	 * @returns The item at the top of the stack, or `undefined` if the stack is
	 *   empty.
	 */
	pop(): T | undefined;

	/**
	 * Returns the item at the top of the stack without removing it.
	 *
	 * @returns The item at the top of the stack, or `undefined` if the stack is
	 *   empty.
	 */
	top(): T | undefined;
}
