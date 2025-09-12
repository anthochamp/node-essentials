import type { Promisable } from "type-fest";
import type { Callable, Predicate } from "../../ecma/function/types.js";
import type { MaybeAsyncIterableIterator } from "../../ecma/iterator/types.js";

/**
 * Error thrown when a list exceeds its capacity.
 */
export class CollectionCapacityExceededError extends Error {
	constructor(capacity: number) {
		super(`List capacity of ${capacity} exceeded`);
		this.name = "CollectionCapacityExceededError";
	}
}

/**
 * Interface representing a collection of elements.
 *
 * @template T The type of elements in the collection.
 */
export interface ICollection<T = unknown>
	extends Iterable<Promisable<T>>,
		AsyncIterable<T> {
	/**
	 * The maximum number of elements the collection can hold.
	 * If the collection is unbounded, this will be `Infinity`.
	 */
	readonly capacity: number;

	/**
	 * Removes all elements from the collection.
	 */
	clear(): Promisable<void>;

	/**
	 * Returns the number of elements in the collection.
	 */
	count(): Promisable<number>;

	/**
	 * Concatenates the given items to the end of the collection and returns an
	 * iterator over the merged items.
	 *
	 * This method does not mutate the original collection.
	 *
	 * @param items The items to merge.
	 * @return An iterator of the merged items.
	 */
	concat(...items: T[]): MaybeAsyncIterableIterator<T>;

	/**
	 * Removes the first occurrence of the item matching the given predicate from the collection.
	 *
	 * @param condition A predicate function to identify the item to remove.
	 * @return `true` if the item was found and removed, `false` otherwise.
	 */
	removeFirst(condition: Predicate<[T]>): Promisable<boolean>;

	/**
	 * Removes all the items matching the given predicate from the collection.
	 *
	 * @param condition A predicate function to identify the items to remove.
	 * @returns An iterable of the removed items.
	 */
	remove(condition: Predicate<[T]>): Promisable<MaybeAsyncIterableIterator<T>>;

	/**
	 * Replaces the first occurence of the item matching the given predicate in the collection with a new item.
	 *
	 * @param condition A predicate function to identify the item to replace.
	 * @param newItem The new item to insert.
	 * @returns `true` if the item was found and replaced, `false` otherwise.
	 */
	replaceFirst(condition: Predicate<[T]>, newItem: T): Promisable<boolean>;

	/**
	 * Replaces all the item matching the given predicate in the collection with a new item.
	 *
	 * @param condition A predicate function to identify the items to replace.
	 * @param newItemFactory A function that takes the old item and returns the new item to insert.
	 * @returns An iterable of the replaced items.
	 */
	replace(
		condition: Predicate<[T]>,
		newItemFactory: Callable<[T], T>,
	): Promisable<MaybeAsyncIterableIterator<T>>;
}
