import type { Callable, DefinedValue, Predicate } from "@ac-kit/core";

import {
	checkCapacity,
	resolveBoundedCapacity,
} from "../collection/_bounded.js";
import { BoundedOptions, IBounded } from "../collection/ibounded.js";
import { IBidirectionalCursorSequence } from "../cursor/ibidirectional-cursor-sequence.js";
import { IPopBackStorage } from "../storage/ipop-back-storage.js";
import { IPopFrontStorage } from "../storage/ipop-front-storage.js";
import { IPushBackStorage } from "../storage/ipush-back-storage.js";
import { IPushFrontStorage } from "../storage/ipush-front-storage.js";
import { setAppends, spliceGrowth } from "./_bounded-list.js";
import {
	DoublyLinkedList,
	DoublyLinkedListCursor,
} from "./doubly-linked-list.js";
import type { IList } from "./ilist.js";

export type BoundedDoublyLinkedListOptions<T extends DefinedValue> =
	BoundedOptions<DoublyLinkedList<T>>;

/**
 * A {@link DoublyLinkedList} that holds at most `capacity` items and throws once
 * full.
 *
 * @template T The type of elements in the list.
 */
export class BoundedDoublyLinkedList<T extends DefinedValue>
	implements
		IList<T>,
		IBounded,
		IPushBackStorage<T>,
		IPopBackStorage<T>,
		IPushFrontStorage<T>,
		IPopFrontStorage<T>,
		IBidirectionalCursorSequence<T, DoublyLinkedListCursor<T>>
{
	private readonly inner: DoublyLinkedList<T>;
	readonly capacity: number;

	constructor(
		iterable: Iterable<T> | undefined,
		options: BoundedDoublyLinkedListOptions<T>,
	) {
		const items = iterable ? Array.from(iterable) : [];

		this.capacity = resolveBoundedCapacity(items.length, options);
		this.inner = options.storage ?? new DoublyLinkedList<T>();

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

	popBack(): T | undefined {
		return this.inner.popBack();
	}

	back(): T | undefined {
		return this.inner.back();
	}

	pushFront(item: T): void {
		checkCapacity(this.inner.count(), 1, this.capacity);

		this.inner.pushFront(item);
	}

	pushFrontAll(items: readonly T[]): void {
		checkCapacity(this.inner.count(), items.length, this.capacity);

		this.inner.pushFrontAll(items);
	}

	popFront(): T | undefined {
		return this.inner.popFront();
	}

	front(): T | undefined {
		return this.inner.front();
	}

	begin(): DoublyLinkedListCursor<T> {
		return this.inner.begin();
	}

	end(): DoublyLinkedListCursor<T> {
		return this.inner.end();
	}

	cursorAt(index: number): DoublyLinkedListCursor<T> {
		return this.inner.cursorAt(index);
	}

	insertAfter(cursor: DoublyLinkedListCursor<T>, item: T): void {
		checkCapacity(this.inner.count(), 1, this.capacity);

		this.inner.insertAfter(cursor, item);
	}

	insertAllAfter(cursor: DoublyLinkedListCursor<T>, items: readonly T[]): void {
		checkCapacity(this.inner.count(), items.length, this.capacity);

		this.inner.insertAllAfter(cursor, items);
	}

	insertBefore(cursor: DoublyLinkedListCursor<T>, item: T): void {
		checkCapacity(this.inner.count(), 1, this.capacity);

		this.inner.insertBefore(cursor, item);
	}

	insertAllBefore(
		cursor: DoublyLinkedListCursor<T>,
		items: readonly T[],
	): void {
		checkCapacity(this.inner.count(), items.length, this.capacity);

		this.inner.insertAllBefore(cursor, items);
	}

	removeAfter(cursor: DoublyLinkedListCursor<T>): T | undefined {
		return this.inner.removeAfter(cursor);
	}

	removeAt(cursor: DoublyLinkedListCursor<T>): T | undefined {
		return this.inner.removeAt(cursor);
	}

	setAt(cursor: DoublyLinkedListCursor<T>, item: T): void {
		this.inner.setAt(cursor, item);
	}
}
