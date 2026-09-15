import type { Callable, Predicate } from "@ac-kit/core";

/** Predicate-driven removal and replacement. */
export interface ISearchable<T> {
	/**
	 * Removes the first occurrence of the item matching the given predicate.
	 *
	 * @param condition A predicate function to identify the item to remove.
	 * @returns `true` if the item was found and removed, `false` otherwise.
	 */
	removeFirst(condition: Predicate<[T]>): boolean;

	/**
	 * Removes every item matching the given predicate.
	 *
	 * @param condition A predicate function to identify the items to remove.
	 * @returns An iterator of the removed items.
	 */
	remove(condition: Predicate<[T]>): IterableIterator<T>;

	/**
	 * Replaces the first occurrence of the item matching the given predicate.
	 *
	 * @param condition A predicate function to identify the item to replace.
	 * @param newItem The new item to insert.
	 * @returns `true` if the item was found and replaced, `false` otherwise.
	 */
	replaceFirst(condition: Predicate<[T]>, newItem: T): boolean;

	/**
	 * Replaces every item matching the given predicate.
	 *
	 * @param condition A predicate function to identify the items to replace.
	 * @param newItemFactory A function that takes the old item and returns the
	 *   new item to insert.
	 * @returns An iterator of the replaced items.
	 */
	replace(
		condition: Predicate<[T]>,
		newItemFactory: Callable<[T], T>,
	): IterableIterator<T>;
}
