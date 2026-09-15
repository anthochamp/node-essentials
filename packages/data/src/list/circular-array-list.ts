import {
	clamp,
	mod,
	type Callable,
	type DefinedValue,
	type Predicate,
} from "@ac-kit/core";

import { IBidirectionalCursorSequence } from "../cursor/ibidirectional-cursor-sequence.js";
import { IndexCursorSequence } from "../cursor/index-cursor-sequence.js";
import { IRandomAccessCursor } from "../cursor/irandom-access-cursor.js";
import { IIndexedStorage } from "../storage/iindexed-storage.js";
import { IPopBackStorage } from "../storage/ipop-back-storage.js";
import { IPopFrontStorage } from "../storage/ipop-front-storage.js";
import { IPushBackStorage } from "../storage/ipush-back-storage.js";
import { IPushFrontStorage } from "../storage/ipush-front-storage.js";
import { IList, ListIndexOutOfBoundsError } from "./ilist.js";

/**
 * A list backed by a growable, wrap-around ("circular") array.
 *
 * Unlike `ArrayList` (`popFront`/`pushFront` are O(n)) or `DoublyLinkedList`
 * (indexing is O(n)), this is the only backing that is O(1) at both ends and
 * O(1) for indexed access throughout.
 *
 * Time complexity: - Access (by index): O(1) - Update (by index): O(1) -
 * Insert/remove at either end: O(1) amortized - Insert/remove elsewhere: O(n) -
 * Search: O(n) Space complexity: O(n)
 *
 * Unbounded. For a capacity, wrap it in `BoundedCircularArrayList` or
 * `BlockingCircularArrayList` — or use `FixedVector`, which is this same ring
 * without the list surface.
 *
 * @template T The type of elements in the list.
 */
export class CircularArrayList<T extends DefinedValue>
	implements
		IList<T>,
		IPushBackStorage<T>,
		IPopBackStorage<T>,
		IPushFrontStorage<T>,
		IPopFrontStorage<T>,
		IIndexedStorage<T>,
		IBidirectionalCursorSequence<T, IRandomAccessCursor<T>>
{
	private static readonly MIN_PHYSICAL_LENGTH = 8;

	private data: (T | undefined)[];
	private head: number;
	private size: number;
	private readonly cursors = new IndexCursorSequence<T>(this);

	constructor(iterable?: Iterable<T>) {
		const items = iterable ? Array.from(iterable) : [];

		// `new Array(n)`, not `Array.from({ length: n })`: the latter iterates and
		// writes `undefined` into every slot, which is the whole allocation cost
		// paid up front for nothing.
		// oxlint-disable-next-line unicorn/no-new-array -- the rule's suggested `Array.from({ length: n })` iterates and writes `undefined` into every slot; measured ~4x slower here
		this.data = new Array<T | undefined>(
			Math.max(items.length, CircularArrayList.MIN_PHYSICAL_LENGTH),
		);
		this.head = 0;
		this.size = items.length;

		for (let i = 0; i < items.length; i++) {
			this.data[i] = items[i];
		}
	}

	*[Symbol.iterator](): Iterator<T> {
		for (let i = 0; i < this.size; i++) {
			yield this.readAt(i);
		}
	}

	async *[Symbol.asyncIterator](): AsyncIterator<T> {
		for (let i = 0; i < this.size; i++) {
			yield this.readAt(i);
		}
	}

	clear(): void {
		// oxlint-disable-next-line unicorn/no-new-array -- the rule's suggested `Array.from({ length: n })` iterates and writes `undefined` into every slot; measured ~4x slower here
		this.data = new Array<T | undefined>(CircularArrayList.MIN_PHYSICAL_LENGTH);
		this.head = 0;
		this.size = 0;
		this.cursors.notifyClear();
	}

	count(): number {
		return this.size;
	}

	removeFirst(condition: Predicate<[T]>): boolean {
		for (let i = 0; i < this.size; i++) {
			if (condition(this.readAt(i))) {
				this.splice(i, 1);
				return true;
			}
		}
		return false;
	}

	remove(condition: Predicate<[T]>): IterableIterator<T> {
		const removedItems: T[] = [];

		let i = 0;
		while (i < this.size) {
			if (condition(this.readAt(i))) {
				removedItems.push(this.readAt(i));
				this.splice(i, 1);
			} else {
				i++;
			}
		}

		return removedItems[Symbol.iterator]();
	}

	replaceFirst(condition: Predicate<[T]>, newItem: T): boolean {
		for (let i = 0; i < this.size; i++) {
			if (condition(this.readAt(i))) {
				this.writeAt(i, newItem);
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

		for (let i = 0; i < this.size; i++) {
			const original = this.readAt(i);

			if (condition(original)) {
				replacedItems.push(original);
				this.writeAt(i, newItemFactory(original));
			}
		}

		return replacedItems[Symbol.iterator]();
	}

	get(index: number): T | undefined {
		index = index < 0 ? this.size + index : index;

		if (index < 0 || index >= this.size) {
			return undefined;
		}

		return this.readAt(index);
	}

	set(index: number, item: T): void {
		index = index < 0 ? this.size + index : index;

		if (index < 0 || index > this.size) {
			throw new ListIndexOutOfBoundsError(index, this.size);
		}

		if (index === this.size) {
			this.ensureCapacityFor(1);
			this.size++;
			this.cursors.notifyMutation(index, 0, 1);
		}

		this.writeAt(index, item);
	}

	splice(
		start: number,
		deleteCount: number = Infinity,
		item?: T,
	): IterableIterator<T> {
		return this.spliceAll(
			start,
			deleteCount,
			item === undefined ? undefined : [item],
		);
	}

	spliceAll(
		start: number,
		deleteCount: number = Infinity,
		items: readonly T[] = [],
	): IterableIterator<T> {
		start = start < 0 ? this.size + start : start;

		if (start < 0 || start > this.size) {
			throw new ListIndexOutOfBoundsError(start, this.size);
		}

		deleteCount = clamp(deleteCount, 0, this.size - start);

		return this.internalSplice(start, deleteCount, items);
	}

	*slice(start: number = 0, end?: number): IterableIterator<T> {
		start = start < 0 ? this.size + start : start;
		end = end === undefined ? this.size : end < 0 ? this.size + end : end;

		if (start < 0 || start >= this.size) {
			throw new ListIndexOutOfBoundsError(start, this.size);
		}

		end = clamp(end, start, this.size);

		for (let i = start; i < end; i++) {
			yield this.readAt(i);
		}
	}

	pushBack(item: T): void {
		this.ensureCapacityFor(1);

		this.data[this.physicalIndex(this.size)] = item;
		this.size++;
		this.cursors.notifyMutation(this.size - 1, 0, 1);
	}

	pushBackAll(items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		this.ensureCapacityFor(items.length);

		const at = this.size;
		for (let i = 0; i < items.length; i++) {
			this.data[this.physicalIndex(at + i)] = items[i]!;
		}
		this.size += items.length;

		this.cursors.notifyMutation(at, 0, items.length);
	}

	popBack(): T | undefined {
		if (this.size === 0) {
			return undefined;
		}

		const physical = this.physicalIndex(this.size - 1);
		const item = this.data[physical] as T;

		// Drop the reference: a ring reuses slots, so a stale one would pin the
		// value for as long as the list lives.
		this.data[physical] = undefined;
		this.size--;

		this.cursors.notifyMutation(this.size, 1, 0);

		return item;
	}

	back(): T | undefined {
		if (this.size === 0) {
			return undefined;
		}

		return this.data[this.physicalIndex(this.size - 1)];
	}

	pushFront(item: T): void {
		this.ensureCapacityFor(1);

		this.head = this.head === 0 ? this.data.length - 1 : this.head - 1;
		this.data[this.head] = item;
		this.size++;

		this.cursors.notifyMutation(0, 0, 1);
	}

	pushFrontAll(items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		this.ensureCapacityFor(items.length);

		// Backwards, so that `items[0]` ends up at the front — `Array.unshift`
		// order, which is what `splice(0, 0, ...items)` used to give.
		for (let i = items.length - 1; i >= 0; i--) {
			this.head = this.head === 0 ? this.data.length - 1 : this.head - 1;
			this.data[this.head] = items[i]!;
		}
		this.size += items.length;

		this.cursors.notifyMutation(0, 0, items.length);
	}

	popFront(): T | undefined {
		if (this.size === 0) {
			return undefined;
		}

		const item = this.data[this.head] as T;

		this.data[this.head] = undefined;
		this.head = this.head + 1 === this.data.length ? 0 : this.head + 1;
		this.size--;

		this.cursors.notifyMutation(0, 1, 0);

		return item;
	}

	front(): T | undefined {
		if (this.size === 0) {
			return undefined;
		}

		return this.data[this.head];
	}

	/**
	 * Front (`start === 0`) and back (nothing remains after the deleted range)
	 * operations touch only the boundary in O(1); an interior operation shifts
	 * the suffix by the net size change in O(n).
	 */
	private internalSplice(
		start: number,
		deleteCount: number,
		items: readonly T[],
	): IterableIterator<T> {
		const removedItems: T[] = [];
		for (let i = 0; i < deleteCount; i++) {
			removedItems.push(this.readAt(start + i));
		}

		const delta = items.length - deleteCount;

		if (delta > 0) {
			this.ensureCapacityFor(delta);
		}

		const end = start + deleteCount;
		const suffixCount = this.size - end;

		if (start === 0) {
			this.head = mod(this.head + deleteCount - items.length, this.data.length);
			this.size += delta;

			for (let i = 0; i < items.length; i++) {
				this.writeAt(i, items[i]!);
			}
		} else if (suffixCount === 0) {
			this.size -= deleteCount;

			for (let i = 0; i < items.length; i++) {
				this.writeAt(this.size + i, items[i]!);
			}

			this.size += items.length;
		} else {
			if (delta > 0) {
				for (let p = this.size - 1; p >= end; p--) {
					this.writeAt(p + delta, this.readAt(p));
				}
			} else if (delta < 0) {
				for (let p = end; p < this.size; p++) {
					this.writeAt(p + delta, this.readAt(p));
				}
			}

			for (let i = 0; i < items.length; i++) {
				this.writeAt(start + i, items[i]!);
			}

			this.size += delta;
		}

		this.cursors.notifyMutation(start, deleteCount, items.length);

		return removedItems[Symbol.iterator]();
	}

	/** Grows and re-linearizes (head becomes `0`) if `size + extra` overflows. */
	private ensureCapacityFor(extra: number): void {
		const required = this.size + extra;

		if (required <= this.data.length) {
			return;
		}

		// oxlint-disable-next-line unicorn/no-new-array -- the rule's suggested `Array.from({ length: n })` iterates and writes `undefined` into every slot; measured ~4x slower here
		const relinearized = new Array<T | undefined>(
			Math.max(
				this.data.length * 2,
				CircularArrayList.MIN_PHYSICAL_LENGTH,
				required,
			),
		);
		for (let i = 0; i < this.size; i++) {
			relinearized[i] = this.data[this.physicalIndex(i)];
		}

		this.data = relinearized;
		this.head = 0;
	}

	private physicalIndex(logicalIndex: number): number {
		return (this.head + logicalIndex) % this.data.length;
	}

	private readAt(logicalIndex: number): T {
		return this.data[this.physicalIndex(logicalIndex)] as T;
	}

	private writeAt(logicalIndex: number, value: T): void {
		this.data[this.physicalIndex(logicalIndex)] = value;
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
