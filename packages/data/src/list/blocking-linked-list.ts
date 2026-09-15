import type { Callable, DefinedValue, Predicate } from "@ac-kit/core";

import { resolveBoundedCapacity } from "../collection/_bounded.js";
import { CapacitySemaphore } from "../collection/_capacity-semaphore.js";
import { BoundedOptions, IBounded } from "../collection/ibounded.js";
import { ICursorSequence } from "../cursor/icursor-sequence.js";
import { IPopFrontStorage } from "../storage/ipop-front-storage.js";
import { IPushBackStorage } from "../storage/ipush-back-storage.js";
import { setAppends, spliceGrowth } from "./_bounded-list.js";
import type { IList } from "./ilist.js";
import { LinkedList, LinkedListCursor } from "./linked-list.js";

export type BlockingLinkedListOptions<T extends DefinedValue> = BoundedOptions<
	LinkedList<T>
>;

/**
 * A {@link LinkedList} that holds at most `capacity` items, and whose
 * `waitSet`/`waitSplice` suspend until room frees up instead of throwing.
 *
 * `set` and `splice` still throw — this type adds a way to wait, it does not
 * change the way to fail.
 *
 * @template T The type of elements in the list.
 */
export class BlockingLinkedList<T extends DefinedValue>
	implements
		IList<T>,
		IBounded,
		IPushBackStorage<T>,
		IPopFrontStorage<T>,
		ICursorSequence<T, LinkedListCursor<T>>
{
	private readonly inner: LinkedList<T>;
	private readonly semaphore: CapacitySemaphore;
	readonly capacity: number;

	constructor(
		iterable: Iterable<T> | undefined,
		options: BlockingLinkedListOptions<T>,
	) {
		const items = iterable ? Array.from(iterable) : [];

		this.capacity = resolveBoundedCapacity(items.length, options);
		this.inner = options.storage ?? new LinkedList<T>();
		this.inner.pushBackAll(items);
		this.semaphore = new CapacitySemaphore(
			this.capacity,
			this.capacity - this.inner.count(),
		);
	}

	[Symbol.iterator](): Iterator<T> {
		return this.inner[Symbol.iterator]();
	}

	clear(): void {
		const count = this.inner.count();

		this.inner.clear();
		this.semaphore.release(count);
	}

	count(): number {
		return this.inner.count();
	}

	removeFirst(condition: Predicate<[T]>): boolean {
		const removed = this.inner.removeFirst(condition);

		if (removed) {
			this.semaphore.release(1);
		}

		return removed;
	}

	remove(condition: Predicate<[T]>): IterableIterator<T> {
		const removed = Array.from(this.inner.remove(condition));

		this.semaphore.release(removed.length);

		return removed[Symbol.iterator]();
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
			this.semaphore.tryAcquireOrThrow(1);
		}

		this.inner.set(index, item);
	}

	async waitSet(
		index: number,
		item: T,
		signal?: AbortSignal | null,
	): Promise<void> {
		if (!setAppends(this.inner.count(), index)) {
			this.inner.set(index, item);
			return;
		}

		await this.semaphore.acquire(1, signal);

		// Re-resolve to the current end: another caller may have mutated the list
		// while this call was waiting.
		this.inner.set(this.inner.count(), item);
	}

	splice(
		start: number,
		deleteCount: number = Infinity,
		item?: T,
	): IterableIterator<T> {
		const growth = spliceGrowth(
			this.inner.count(),
			start,
			deleteCount,
			item === undefined ? 0 : 1,
		);

		if (growth > 0) {
			this.semaphore.tryAcquireOrThrow(growth);
		}

		const removed = this.inner.splice(start, deleteCount, item);

		if (growth < 0) {
			this.semaphore.release(-growth);
		}

		return removed;
	}

	spliceAll(
		start: number,
		deleteCount: number = Infinity,
		items: readonly T[] = [],
	): IterableIterator<T> {
		const growth = spliceGrowth(
			this.inner.count(),
			start,
			deleteCount,
			items.length,
		);

		if (growth > 0) {
			this.semaphore.tryAcquireOrThrow(growth);
		}

		const removed = this.inner.spliceAll(start, deleteCount, items);

		if (growth < 0) {
			this.semaphore.release(-growth);
		}

		return removed;
	}

	waitSplice(
		start: number,
		deleteCount: number = Infinity,
		item?: T,
		signal?: AbortSignal | null,
	): Promise<IterableIterator<T>> {
		return this.waitSpliceAll(
			start,
			deleteCount,
			item === undefined ? undefined : [item],
			signal,
		);
	}

	async waitSpliceAll(
		start: number,
		deleteCount: number = Infinity,
		items?: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<IterableIterator<T>> {
		const itemsArray = items ? Array.from(items) : [];
		const count = this.inner.count();
		const isAppend = (start < 0 ? count + start : start) === count;
		const growth = spliceGrowth(count, start, deleteCount, itemsArray.length);

		if (growth > 0) {
			await this.semaphore.acquire(growth, signal);

			if (isAppend) {
				// Re-resolve to the current end: another caller may have mutated the
				// list while this call was waiting.
				return this.inner.spliceAll(this.inner.count(), 0, itemsArray);
			}
		}

		const removed = this.inner.spliceAll(start, deleteCount, itemsArray);

		if (growth < 0) {
			this.semaphore.release(-growth);
		}

		return removed;
	}

	slice(start?: number, end?: number): IterableIterator<T> {
		return this.inner.slice(start, end);
	}

	pushBack(item: T): void {
		this.semaphore.tryAcquireOrThrow(1);

		this.inner.pushBack(item);
	}

	pushBackAll(items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		this.semaphore.tryAcquireOrThrow(items.length);
		this.inner.pushBackAll(items);
	}

	popFront(): T | undefined {
		const item = this.inner.popFront();

		if (item !== undefined) {
			this.semaphore.release(1);
		}

		return item;
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
		this.semaphore.tryAcquireOrThrow(1);
		this.inner.insertAfter(cursor, item);
	}

	insertAllAfter(cursor: LinkedListCursor<T>, items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		this.semaphore.tryAcquireOrThrow(items.length);
		this.inner.insertAllAfter(cursor, items);
	}

	removeAfter(cursor: LinkedListCursor<T>): T | undefined {
		const item = this.inner.removeAfter(cursor);

		if (item !== undefined) {
			this.semaphore.release(1);
		}

		return item;
	}

	setAt(cursor: LinkedListCursor<T>, item: T): void {
		this.inner.setAt(cursor, item);
	}
}
