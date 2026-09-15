import type { Callable, DefinedValue, Predicate } from "@ac-kit/core";

import {
	checkCapacity,
	resolveBoundedCapacity,
} from "../collection/_bounded.js";
import { BoundedOptions, IBounded } from "../collection/ibounded.js";
import { ICursorSequence } from "../cursor/icursor-sequence.js";
import { IPopFrontStorage } from "../storage/ipop-front-storage.js";
import { IPushBackStorage } from "../storage/ipush-back-storage.js";
import { setAppends, spliceGrowth } from "./_bounded-list.js";
import type { IList } from "./ilist.js";
import { LinkedList, LinkedListCursor } from "./linked-list.js";

export type BoundedLinkedListOptions<T extends DefinedValue> = BoundedOptions<
	LinkedList<T>
>;

/**
 * A {@link LinkedList} that holds at most `capacity` items and throws once full.
 *
 * @template T The type of elements in the list.
 */
export class BoundedLinkedList<T extends DefinedValue>
	implements
		IList<T>,
		IBounded,
		IPushBackStorage<T>,
		IPopFrontStorage<T>,
		ICursorSequence<T, LinkedListCursor<T>>
{
	private readonly inner: LinkedList<T>;
	readonly capacity: number;

	constructor(
		iterable: Iterable<T> | undefined,
		options: BoundedLinkedListOptions<T>,
	) {
		const items = iterable ? Array.from(iterable) : [];

		this.capacity = resolveBoundedCapacity(items.length, options);
		this.inner = options.storage ?? new LinkedList<T>();

		this.inner.pushBackAll(items);
	}

	[Symbol.iterator](): Iterator<T> {
		return this.inner[Symbol.iterator]();
	}

	clear(): void {
		this.inner.clear();
	}

	count(): number {
		return this.inner.count();
	}

	removeFirst(condition: Predicate<[T]>): boolean {
		return this.inner.removeFirst(condition);
	}

	remove(condition: Predicate<[T]>): IterableIterator<T> {
		return this.inner.remove(condition);
	}

	replaceFirst(condition: Predicate<[T]>, newItem: T): boolean {
		return this.inner.replaceFirst(condition, newItem);
	}

	replace(
		condition: Predicate<[T]>,
		newItemFactory: Callable<[T], T>,
	): IterableIterator<T> {
		return this.inner.replace(condition, newItemFactory);
	}

	get(index: number): T | undefined {
		return this.inner.get(index);
	}

	set(index: number, item: T): void {
		if (setAppends(this.inner.count(), index)) {
			checkCapacity(this.inner.count(), 1, this.capacity);
		}

		this.inner.set(index, item);
	}

	splice(
		start: number,
		deleteCount: number = Infinity,
		item?: T,
	): IterableIterator<T> {
		checkCapacity(
			this.inner.count(),
			spliceGrowth(
				this.inner.count(),
				start,
				deleteCount,
				item === undefined ? 0 : 1,
			),
			this.capacity,
		);

		return this.inner.splice(start, deleteCount, item);
	}

	spliceAll(
		start: number,
		deleteCount: number = Infinity,
		items: readonly T[] = [],
	): IterableIterator<T> {
		checkCapacity(
			this.inner.count(),
			spliceGrowth(this.inner.count(), start, deleteCount, items.length),
			this.capacity,
		);

		return this.inner.spliceAll(start, deleteCount, items);
	}

	slice(start?: number, end?: number): IterableIterator<T> {
		return this.inner.slice(start, end);
	}

	pushBack(item: T): void {
		checkCapacity(this.inner.count(), 1, this.capacity);

		this.inner.pushBack(item);
	}

	pushBackAll(items: readonly T[]): void {
		checkCapacity(this.inner.count(), items.length, this.capacity);

		this.inner.pushBackAll(items);
	}

	popFront(): T | undefined {
		return this.inner.popFront();
	}

	front(): T | undefined {
		return this.inner.front();
	}

	begin(): LinkedListCursor<T> {
		return this.inner.begin();
	}

	end(): LinkedListCursor<T> {
		return this.inner.end();
	}

	cursorAt(index: number): LinkedListCursor<T> {
		return this.inner.cursorAt(index);
	}

	insertAfter(cursor: LinkedListCursor<T>, item: T): void {
		checkCapacity(this.inner.count(), 1, this.capacity);

		this.inner.insertAfter(cursor, item);
	}

	insertAllAfter(cursor: LinkedListCursor<T>, items: readonly T[]): void {
		checkCapacity(this.inner.count(), items.length, this.capacity);

		this.inner.insertAllAfter(cursor, items);
	}

	removeAfter(cursor: LinkedListCursor<T>): T | undefined {
		return this.inner.removeAfter(cursor);
	}

	setAt(cursor: LinkedListCursor<T>, item: T): void {
		this.inner.setAt(cursor, item);
	}
}
