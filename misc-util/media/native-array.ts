import { Semaphore } from "../async/semaphore.js";
import type { Callable, Predicate } from "../ecma/function/types.js";
import { clamp } from "../ecma/math/clamp.js";
import { CollectionCapacityExceededError } from "./abstract-types/icollection.js";
import {
	type IList,
	ListIndexOutOfBoundsError,
} from "./abstract-types/ilist.js";

/**
 * A list implementation using the JS built-in array as the underlying data
 * structure.
 *
 * Time complexity (supposedly, depending on JS engine optimizations):
 * - Access (by index): O(1)
 * - Update (by index): O(1)
 * - Insert: amortized O(1) at tail, O(n) otherwise.
 * - Remove: O(1) at tail, O(n) otherwise.
 * - Search: O(n)
 * Space complexity: O(n)
 *
 * If implemented as a circular buffer, the time complexity for insertions and
 * deletions at both ends might be O(1).
 *
 * @template T The type of elements in the list.
 */
export class NativeArray<T> implements IList<T> {
	private readonly data: T[];
	private readonly semaphore: Semaphore;

	constructor(
		iterable?: Iterable<T>,
		readonly capacity: number = Infinity,
	) {
		this.data = iterable ? Array.from(iterable) : [];

		if (this.data.length > capacity) {
			throw new RangeError("Initial iterable exceeds the specified capacity");
		}

		this.semaphore = new Semaphore(capacity, capacity - this.data.length);
	}

	[Symbol.iterator](): Iterator<T> {
		return this.data[Symbol.iterator]();
	}

	async *[Symbol.asyncIterator](): AsyncIterator<T> {
		yield* this.data;
	}

	clear(): void {
		const length = this.data.length;
		this.data.length = 0;
		this.semaphore.release(length);
	}

	count(): number {
		return this.data.length;
	}

	concat(...items: T[]): IterableIterator<T> {
		return this.data.concat(items)[Symbol.iterator]();
	}

	removeFirst(condition: Predicate<[T]>): boolean {
		for (let i = 0; i < this.data.length; i++) {
			if (condition(this.data[i])) {
				this.data.splice(i, 1);
				this.semaphore.release(1);
				return true;
			}
		}
		return false;
	}

	remove(condition: Predicate<[T]>): IterableIterator<T> {
		const removedItems: T[] = [];

		let i = 0;
		while (i < this.data.length) {
			if (condition(this.data[i])) {
				removedItems.push(this.data[i]);
				this.data.splice(i, 1);
				this.semaphore.release(1);
			} else {
				i++;
			}
		}

		return removedItems[Symbol.iterator]();
	}

	replaceFirst(condition: Predicate<[T]>, newItem: T): boolean {
		for (let i = 0; i < this.data.length; i++) {
			if (condition(this.data[i])) {
				this.data[i] = newItem;
				return true;
			}
		}
		return false;
	}

	replace(
		condition: Predicate<[T]>,
		newItemFactory: Callable<[T], T>,
	): IterableIterator<T> {
		const replacedItems: T[] = [];

		for (let i = 0; i < this.data.length; i++) {
			if (condition(this.data[i])) {
				replacedItems.push(this.data[i]);
				this.data[i] = newItemFactory(this.data[i]);
			}
		}

		return replacedItems[Symbol.iterator]();
	}

	get(index: number): T | undefined {
		index = index < 0 ? this.data.length + index : index;

		if (index < 0 || index >= this.data.length) {
			return;
		}

		return this.data[index];
	}

	set(index: number, item: T): void {
		index = index < 0 ? this.data.length + index : index;

		if (index < 0 || index > this.data.length) {
			throw new ListIndexOutOfBoundsError(index, this.data.length);
		}

		if (index === this.data.length && !this.semaphore.tryAcquire()) {
			throw new CollectionCapacityExceededError(this.capacity);
		}

		this.data[index] = item;
	}

	async waitSet(
		index: number,
		item: T,
		signal?: AbortSignal | null,
	): Promise<void> {
		index = index < 0 ? this.data.length + index : index;

		if (index < 0 || index > this.data.length) {
			throw new ListIndexOutOfBoundsError(index, this.data.length);
		}

		if (index === this.data.length) {
			await this.semaphore.acquire(1, signal);
		}

		this.data[index] = item;
	}

	splice(
		start: number,
		deleteCount: number = Infinity,
		...items: T[]
	): IterableIterator<T> {
		start = start < 0 ? this.data.length + start : start;

		if (start < 0 || start > this.data.length) {
			throw new ListIndexOutOfBoundsError(start, this.data.length);
		}

		deleteCount = clamp(deleteCount, 0, this.data.length - start);

		const toAcquire = items.length - deleteCount;
		if (toAcquire > 0 && !this.semaphore.tryAcquire(toAcquire)) {
			throw new CollectionCapacityExceededError(this.capacity);
		}

		const removedItems = this.data.splice(start, deleteCount, ...items);

		if (toAcquire < 0) {
			this.semaphore.release(-toAcquire);
		}

		return removedItems[Symbol.iterator]();
	}

	async waitSplice(
		start: number,
		deleteCount: number = Infinity,
		items?: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<IterableIterator<T>> {
		start = start < 0 ? this.data.length + start : start;

		if (start < 0 || start > this.data.length) {
			throw new ListIndexOutOfBoundsError(start, this.data.length);
		}

		deleteCount = clamp(deleteCount, 0, this.data.length - start);

		const itemsArray = items ? Array.from(items) : [];

		const toAcquire = itemsArray.length - deleteCount;

		if (toAcquire > 0) {
			await this.semaphore.acquire(toAcquire, signal);
		}

		const removedItems = this.data.splice(start, deleteCount, ...itemsArray);

		if (toAcquire < 0) {
			this.semaphore.release(-toAcquire);
		}

		return removedItems[Symbol.iterator]();
	}

	*slice(start: number = 0, end?: number): IterableIterator<T> {
		start = start < 0 ? this.data.length + start : start;
		end =
			end === undefined
				? this.data.length
				: end < 0
					? this.data.length + end
					: end;

		if (start < 0 || start >= this.data.length) {
			throw new ListIndexOutOfBoundsError(start, this.data.length);
		}

		end = clamp(end, start, this.data.length);

		yield* this.data.slice(start, end);
	}
}
