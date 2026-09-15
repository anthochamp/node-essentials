import type { DefinedValue } from "@ac-kit/core";

import { ICollection } from "../collection/icollection.js";
import { ISearchable } from "../collection/isearchable.js";

/** Error thrown when an index is out of bounds. */
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
 * Contrary to Javascript Array, the list cannot be sparse (i.e., it cannot have
 * "holes" or missing elements). All indices between `0` and `count() - 1` are
 * guaranteed to be valid.
 *
 * @template T The type of elements in the list. Anything except `undefined`,
 *   which means "no element".
 */
export interface IList<T extends DefinedValue = DefinedValue>
	extends ICollection<T>, ISearchable<T> {
	/**
	 * Returns the item at the specified index.
	 *
	 * If the index is negative, it counts from the end of the list. If the index
	 * is out of bounds, `undefined` is returned.
	 *
	 * **Not uniformly O(1).** This member reads as positional access, but only a
	 * random-access backing answers it in constant time. On a linked backing, it
	 * walks from an end, so a loop calling `get` over every index is quadratic.
	 * Iterate the list, or take a cursor
	 * ({@link ICursorSequence}/{@link IBidirectionalCursorSequence}), whenever
	 * the access pattern is sequential. Each implementation states its own
	 * complexity.
	 *
	 * @param index The index of the item to retrieve.
	 * @returns The item at the specified index, or `undefined` if the index is
	 *   out of bounds.
	 */
	get(index: number): T | undefined;

	/**
	 * Sets the item at the specified index.
	 *
	 * If the index is negative, it counts from the end of the list. If the index
	 * is equal to the length of the list, the item is appended to the end. If the
	 * index is out of bounds, a RangeError is thrown.
	 *
	 * @param index The index at which to set the item.
	 * @param item The item to set.
	 * @throws {ListIndexOutOfBoundsError} If the index is out of bounds.
	 */
	set(index: number, item: T): void;

	/**
	 * Change the content of the list by removing or replacing existing elements
	 * and/or adding new elements in place.
	 *
	 * If the start index is negative, it counts from the end of the list. If the
	 * start index is equal to the length of the list, no elements are removed and
	 * the items are appended to the end of the list. If the start index is out of
	 * bounds, a RangeError is thrown.
	 *
	 * If deleteCount is omitted, it defaults to `Infinity`, meaning all elements
	 * from the start index to the end of the list will be removed. If deleteCount
	 * is greater than the number of elements from start to the end of the list,
	 * it will remove all elements from start to the end of the list. If
	 * deleteCount is `0` or negative, no elements will be removed.
	 *
	 * If items are provided, they will be inserted starting at the start index.
	 *
	 * @param start The index at which to start changing the list.
	 * @param deleteCount The number of elements to remove from the list. Defaults
	 *   to `Infinity`
	 * @param item An optional element to add to the list at the start index.
	 * @returns An iterable of the removed items.
	 * @throws {ListIndexOutOfBoundsError} If the start index is out of bounds.
	 */
	splice(start: number, deleteCount?: number, item?: T): IterableIterator<T>;

	/**
	 * Same as {@link IList.splice}, but inserts every element of `items` at the
	 * start index, keeping their relative order.
	 *
	 * @param start The index at which to start changing the list.
	 * @param deleteCount The number of elements to remove from the list. Defaults
	 *   to `Infinity`
	 * @param items The elements to add to the list, beginning at the start index.
	 * @returns An iterable of the removed items.
	 * @throws {ListIndexOutOfBoundsError} If the start index is out of bounds.
	 */
	spliceAll(
		start: number,
		deleteCount?: number,
		items?: readonly T[],
	): IterableIterator<T>;

	/**
	 * Slice the list to a new list from start to end.
	 *
	 * This method does not mutate the original list.
	 *
	 * The range is specified by the `start` and `end` parameters, which are
	 * inclusive and exclusive, respectively. If `start` is omitted, it defaults
	 * to `0`. If `end` is omitted, it defaults to the length of the list.
	 *
	 * If either `start` or `end` is negative, they refer to positions from the
	 * end of the list. For example, `-1` refers to the last element, `-2` refers
	 * to the second last element, and so on.
	 *
	 * If `start` is greater than or equal to `end`, the result is an empty
	 * iterator.
	 *
	 * If the `start` index is out of bounds, a RangeError is thrown. If `end` is
	 * out of bounds, it is clamped to the valid range.
	 *
	 * @param start Optional start index of the range (inclusive).
	 * @param end Optional end index of the range (exclusive).
	 * @returns An iterator for the elements in the specified range.
	 * @throws {ListIndexOutOfBoundsError} If the start index is out of bounds.
	 */
	slice(start?: number, end?: number): IterableIterator<T>;
}
