import type { DefinedValue, OrderPredicate } from "@ac-kit/core";

import { ICollection } from "../collection/icollection.js";

/**
 * Interface representing a heap data type.
 *
 * @template T The type of elements in the heap. Anything except `undefined`,
 *   which means "no element".
 */
export interface IHeap<
	T extends DefinedValue = DefinedValue,
> extends ICollection<T> {
	/** Strict weak ordering: `precedes(a, b)` is `true` when `a` outranks `b`. */
	readonly precedes: OrderPredicate<T>;

	/**
	 * Inserts an item into the heap.
	 *
	 * @param item The item to insert.
	 */
	insert(item: T): void;

	/**
	 * Inserts every item into the heap.
	 *
	 * @param items The items to insert.
	 */
	insertAll(items: readonly T[]): void;

	/**
	 * Removes and returns the root item of the heap.
	 *
	 * @returns The root item of the heap, or `undefined` if the heap is empty.
	 */
	extract(): T | undefined;

	/**
	 * Returns the root item of the heap without removing it.
	 *
	 * @returns The root item of the heap, or `undefined` if the heap is empty.
	 */
	peek(): T | undefined;

	/**
	 * Extracts the root item from the heap and inserts a new item in one
	 * operation.
	 *
	 * @param item The item to replace.
	 */
	extractAndInsert(item: T): T | undefined;

	/**
	 * Inserts an item into the heap and then extracts and returns the root item
	 * in one operation.
	 *
	 * @param item The item to insert and extract.
	 */
	insertAndExtract(item: T): T | undefined;
}
