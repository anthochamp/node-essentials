import {
	clamp,
	type Callable,
	type DefinedValue,
	type Predicate,
} from "@ac-kit/core";

import { IBidirectionalCursorSequence } from "../cursor/ibidirectional-cursor-sequence.js";
import { IndexCursorSequence } from "../cursor/index-cursor-sequence.js";
import { IRandomAccessCursor } from "../cursor/irandom-access-cursor.js";
import { IIndexedStorage } from "../storage/iindexed-storage.js";
import { IPopBackStorage } from "../storage/ipop-back-storage.js";
import { IPushBackStorage } from "../storage/ipush-back-storage.js";
import { IList, ListIndexOutOfBoundsError } from "./ilist.js";

/**
 * A list implementation using the JS built-in array as the underlying data
 * structure.
 *
 * Time complexity: - Access (by index): O(1) - Update (by index): O(1) -
 * Insert: amortized O(1) at tail, O(n) otherwise. - Remove: O(1) at tail, O(n)
 * otherwise. - Search: O(n) Space complexity: O(n)
 *
 * `popFront`/`pushFront` are deliberately not declared — they are O(n) on this
 * backing. See `CircularArrayList` for O(1) throughout.
 *
 * Unbounded. For a capacity, wrap it in `BoundedArrayList` or
 * `BlockingArrayList`.
 *
 * @template T The type of elements in the list.
 */
export class ArrayList<T extends DefinedValue>
	implements
		IList<T>,
		IPushBackStorage<T>,
		IPopBackStorage<T>,
		IIndexedStorage<T>,
		IBidirectionalCursorSequence<T, IRandomAccessCursor<T>>
{
	private readonly data: T[];
	private readonly cursors = new IndexCursorSequence<T>(this);

	constructor(iterable?: Iterable<T>) {
		this.data = iterable ? Array.from(iterable) : [];
	}

	[Symbol.iterator](): Iterator<T> {
		return this.data[Symbol.iterator]();
	}

	async *[Symbol.asyncIterator](): AsyncIterator<T> {
		yield* this.data;
	}

	clear(): void {
		this.data.length = 0;
		this.cursors.notifyClear();
	}

	count(): number {
		return this.data.length;
	}

	removeFirst(condition: Predicate<[T]>): boolean {
		for (let i = 0; i < this.data.length; i++) {
			if (condition(this.data[i]!)) {
				this.data.splice(i, 1);
				this.cursors.notifyMutation(i, 1, 0);
				return true;
			}
		}
		return false;
	}

	remove(condition: Predicate<[T]>): IterableIterator<T> {
		const removedItems: T[] = [];

		let i = 0;
		while (i < this.data.length) {
			const data = this.data[i]!;

			if (condition(data)) {
				removedItems.push(data);
				this.data.splice(i, 1);
				this.cursors.notifyMutation(i, 1, 0);
			} else {
				i++;
			}
		}

		return removedItems[Symbol.iterator]();
	}

	replaceFirst(condition: Predicate<[T]>, newItem: T): boolean {
		for (let i = 0; i < this.data.length; i++) {
			if (condition(this.data[i]!)) {
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
			const originalData = this.data[i]!;

			if (condition(originalData)) {
				replacedItems.push(originalData);
				this.data[i] = newItemFactory(originalData);
			}
		}

		return replacedItems[Symbol.iterator]();
	}

	get(index: number): T | undefined {
		const length = this.data.length;

		index = index < 0 ? length + index : index;

		if (index < 0 || index >= length) {
			return;
		}

		return this.data[index];
	}

	set(index: number, item: T): void {
		index = index < 0 ? this.data.length + index : index;

		if (index < 0 || index > this.data.length) {
			throw new ListIndexOutOfBoundsError(index, this.data.length);
		}

		if (index === this.data.length) {
			this.cursors.notifyMutation(index, 0, 1);
		}

		this.data[index] = item;
	}

	splice(
		start: number,
		deleteCount: number = Infinity,
		item?: T,
	): IterableIterator<T> {
		start = start < 0 ? this.data.length + start : start;

		if (start < 0 || start > this.data.length) {
			throw new ListIndexOutOfBoundsError(start, this.data.length);
		}

		deleteCount = clamp(deleteCount, 0, this.data.length - start);

		const removedItems =
			item === undefined
				? this.data.splice(start, deleteCount)
				: this.data.splice(start, deleteCount, item);

		this.cursors.notifyMutation(start, deleteCount, item === undefined ? 0 : 1);

		return removedItems[Symbol.iterator]();
	}

	spliceAll(
		start: number,
		deleteCount: number = Infinity,
		items: readonly T[] = [],
	): IterableIterator<T> {
		start = start < 0 ? this.data.length + start : start;

		if (start < 0 || start > this.data.length) {
			throw new ListIndexOutOfBoundsError(start, this.data.length);
		}

		deleteCount = clamp(deleteCount, 0, this.data.length - start);

		// `toSpliced` would copy the whole backing; the native mutating `splice`
		// is the one operation here that genuinely needs a spread.
		const removedItems = this.data.splice(start, deleteCount, ...items);

		this.cursors.notifyMutation(start, deleteCount, items.length);

		return removedItems[Symbol.iterator]();
	}

	pushBack(item: T): void {
		const index = this.data.length;

		this.data.push(item);
		this.cursors.notifyMutation(index, 0, 1);
	}

	pushBackAll(items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		const index = this.data.length;

		for (let i = 0; i < items.length; i++) {
			this.data.push(items[i]!);
		}

		this.cursors.notifyMutation(index, 0, items.length);
	}

	popBack(): T | undefined {
		if (this.data.length === 0) {
			return undefined;
		}

		const item = this.data.pop()!;

		this.cursors.notifyMutation(this.data.length, 1, 0);

		return item;
	}

	back(): T | undefined {
		return this.data[this.data.length - 1];
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

	begin(): IRandomAccessCursor<T> {
		return this.cursors.begin();
	}

	end(): IRandomAccessCursor<T> {
		return this.cursors.end();
	}

	cursorAt(index: number): IRandomAccessCursor<T> {
		return this.cursors.cursorAt(index);
	}

	insertAfter(cursor: IRandomAccessCursor<T>, item: T): void {
		this.cursors.insertAfter(cursor, item);
	}

	insertAllAfter(cursor: IRandomAccessCursor<T>, items: readonly T[]): void {
		this.cursors.insertAllAfter(cursor, items);
	}

	insertBefore(cursor: IRandomAccessCursor<T>, item: T): void {
		this.cursors.insertBefore(cursor, item);
	}

	insertAllBefore(cursor: IRandomAccessCursor<T>, items: readonly T[]): void {
		this.cursors.insertAllBefore(cursor, items);
	}

	removeAfter(cursor: IRandomAccessCursor<T>): T | undefined {
		return this.cursors.removeAfter(cursor);
	}

	removeAt(cursor: IRandomAccessCursor<T>): T | undefined {
		return this.cursors.removeAt(cursor);
	}

	setAt(cursor: IRandomAccessCursor<T>, item: T): void {
		this.cursors.setAt(cursor, item);
	}
}
