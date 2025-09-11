import type { Promisable } from "type-fest";
import type { ICollection } from "./icollection.js";

/**
 * Interface representing a heap data type.
 *
 * @template T The type of elements in the heap.
 */
export interface IHeap<T = unknown> extends ICollection<T> {
	/**
	 * Inserts one or more items into the heap.
	 *
	 * @param items The items to insert.
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the heap capacity.
	 */
	insert(...items: T[]): Promisable<void>;

	/**
	 * Same as `insert`, but waits for capacity if the operation would exceed it.
	 *
	 * @see IHeap.insert
	 * @param signal Optional abort signal to cancel the operation.
	 */
	waitInsert(
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): PromiseLike<void>;

	/**
	 * Removes and returns the root item of the heap.
	 *
	 * @returns The root item of the heap, or `undefined` if the heap is empty.
	 */
	extract(): Promisable<T | undefined>;

	/**
	 * Extracts the root item from the heap and inserts a new item in one operation.
	 *
	 * @param item The item to replace.
	 */
	extractAndInsert(item: T): Promisable<T | undefined>;

	/**
	 * Inserts an item into the heap and then extracts and returns the root item
	 * in one operation.
	 *
	 * @param item The item to insert and extract.
	 */
	insertAndExtract(item: T): Promisable<T | undefined>;

	/**
	 * Returns the root item of the heap without removing it.
	 *
	 * @returns The root item of the heap, or `undefined` if the heap is empty.
	 */
	root(): Promisable<T | undefined>;
}
