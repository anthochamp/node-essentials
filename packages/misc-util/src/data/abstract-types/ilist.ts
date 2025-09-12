import type { Promisable } from "type-fest";
import type { MaybeAsyncIterableIterator } from "../../ecma/iterator/types.js";
import type { ICollection } from "./icollection.js";

/**
 * Error thrown when an index is out of bounds.
 */
export class ListIndexOutOfBoundsError extends RangeError {
	constructor(index: number, max: number) {
		super(`Index ${index} is out of bounds [0, ${max}]`);
		this.name = "ListIndexOutOfBoundsError";
	}
}

/**
 * Interface representing an ordered data collection.
 *
 * The list does not allow `undefined` as a valid element.
 *
 * The list may or may not be optimized for random access, depending on the
 * implementation.
 *
 * Contrary to Javascript Array, the list cannot be sparse (i.e., it cannot
 * have "holes" or missing elements). All indices between `0` and `count() - 1`
 * are guaranteed to be valid.
 *
 * The list may have a fixed capacity, in which case it cannot grow beyond that
 * capacity. If the list is unbounded, its capacity is `Infinity`.
 *
 * @template T The type of elements in the list.
 */
export interface IList<T = unknown> extends ICollection<T> {
	/**
	 * Returns the item at the specified index.
	 *
	 * If the index is negative, it counts from the end of the list.
	 * If the index is out of bounds, `undefined` is returned.
	 *
	 * @param index The index of the item to retrieve.
	 * @returns The item at the specified index, or `undefined` if the index is out of bounds.
	 */
	get(index: number): Promisable<T | undefined>;

	/**
	 * Sets the item at the specified index.
	 *
	 * If the index is negative, it counts from the end of the list.
	 * If the index is equal to the length of the list, the item is appended to the end.
	 * If the index is out of bounds, a RangeError is thrown.
	 *
	 * @param index The index at which to set the item.
	 * @param item The item to set.
	 * @throws {ListIndexOutOfBoundsError} If the index is out of bounds.
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the list's capacity.
	 */
	set(index: number, item: T): Promisable<void>;

	/**
	 * Same as `set`, but waits for capacity if the operation would exceed it.
	 *
	 * @see IList.set
	 * @param signal Optional abort signal to cancel the operation.
	 */
	waitSet(
		index: number,
		item: T,
		signal?: AbortSignal | null,
	): PromiseLike<void>;

	/**
	 * Change the content of the list by removing or replacing existing elements
	 * and/or adding new elements in place.
	 *
	 * If the start index is negative, it counts from the end of the list.
	 * If the start index is equal to the length of the list, no elements are
	 * removed and the items are appended to the end of the list.
	 * If the start index is out of bounds, a RangeError is thrown.
	 *
	 * If deleteCount is omitted, it defaults to `Infinity`, meaning all elements
	 * from the start index to the end of the list will be removed.
	 * If deleteCount is greater than the number of elements from start to the end
	 * of the list, it will remove all elements from start to the end of the list.
	 * If deleteCount is `0` or negative, no elements will be removed.
	 *
	 * If items are provided, they will be inserted starting at the start index.
	 *
	 * @param start The index at which to start changing the list.
	 * @param deleteCount The number of elements to remove from the list. Defaults to `Infinity`
	 * @param items The elements to add to the list, beginning at the start index.
	 * @returns An iterable of the removed items.
	 * @throws {ListIndexOutOfBoundsError} If the start index is out of bounds.
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the list's capacity.
	 */
	splice(
		start: number,
		deleteCount?: number,
		...items: T[]
	): Promisable<MaybeAsyncIterableIterator<T>>;

	/**
	 * The same as `splice`, but waits for capacity if the operation would exceed it.
	 *
	 * @see IList.splice
	 * @param signal Optional abort signal to cancel the operation.
	 */
	waitSplice(
		start: number,
		deleteCount?: number,
		items?: Iterable<T>,
		signal?: AbortSignal | null,
	): PromiseLike<MaybeAsyncIterableIterator<T>>;

	/**
	 * Slice the list to a new list from start to end.
	 *
	 * This method does not mutate the original list.
	 *
	 * The range is specified by the `start` and `end` parameters, which are
	 * inclusive and exclusive, respectively. If `start` is omitted, it defaults
	 * to `0`. If `end` is omitted, it defaults to the length of the list.
	 *
	 * If either `start` or `end` is negative, they refer to positions from the end
	 * of the list. For example, `-1` refers to the last element, `-2` refers to
	 * the second last element, and so on.
	 *
	 * If `start` is greater than or equal to `end`, the result is an empty iterator.
	 *
	 * If the `start` index is out of bounds, a RangeError is thrown. If `end` is
	 * out of bounds, it is clamped to the valid range.
	 *
	 * @param start Optional start index of the range (inclusive).
	 * @param end Optional end index of the range (exclusive).
	 * @returns An iterator for the elements in the specified range.
	 * @throws {ListIndexOutOfBoundsError} If the start index is out of bounds.
	 */
	slice(
		start?: number,
		end?: number,
	): Promisable<MaybeAsyncIterableIterator<T>>;
}
