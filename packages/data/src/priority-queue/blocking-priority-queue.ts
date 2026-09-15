import type { DefinedValue, OrderPredicate, Predicate } from "@ac-kit/core";

import { resolveBoundedCapacity } from "../collection/_bounded.js";
import { CapacitySemaphore } from "../collection/_capacity-semaphore.js";
import { BoundedOptions } from "../collection/ibounded.js";
import { HeapStorage } from "../heap/iheap-storage.js";
import type { PriorityEntry } from "./ipriority-queue.js";
import { IWaitablePriorityQueue } from "./iwaitable-priority-queue.js";
import { PriorityQueue } from "./priority-queue.js";

export type BlockingPriorityQueueOptions<
	T extends DefinedValue,
	P,
> = BoundedOptions<HeapStorage<PriorityEntry<T, P>>>;

/**
 * A priority queue that holds at most `capacity` items, and whose `waitInsert`
 * suspends until room frees up instead of throwing.
 *
 * `insert` still throws — this type adds a way to wait, it does not change the
 * way to fail.
 *
 * @template T The type of elements in the priority queue.
 * @template P The type of priority associated with each element.
 */
export class BlockingPriorityQueue<
	T extends DefinedValue,
	P = number,
> implements IWaitablePriorityQueue<T, P> {
	private readonly inner: PriorityQueue<T, P>;
	private readonly semaphore: CapacitySemaphore;
	readonly capacity: number;

	constructor(
		readonly precedes: OrderPredicate<P> = (a, b) => a < b,
		iterable: Iterable<[T, P]> | undefined,
		options: BlockingPriorityQueueOptions<T, P>,
	) {
		const items = iterable ? Array.from(iterable) : [];

		this.capacity = resolveBoundedCapacity(items.length, options);
		this.inner = new PriorityQueue<T, P>(precedes, items, {
			storage: options.storage,
		});
		this.semaphore = new CapacitySemaphore(
			this.capacity,
			this.capacity - items.length,
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

	insert(priority: P, item: T): void {
		this.semaphore.tryAcquireOrThrow(1);
		this.inner.insert(priority, item);
	}

	insertAll(priority: P, items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		this.semaphore.tryAcquireOrThrow(items.length);
		this.inner.insertAll(priority, items);
	}

	async waitInsert(
		priority: P,
		item: T,
		signal?: AbortSignal | null,
	): Promise<void> {
		await this.semaphore.acquire(1, signal);
		this.inner.insert(priority, item);
	}

	async waitInsertAll(
		priority: P,
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<void> {
		const itemsArray = Array.from(items);

		if (itemsArray.length === 0) {
			return;
		}

		await this.semaphore.acquire(itemsArray.length, signal);
		this.inner.insertAll(priority, itemsArray);
	}

	extract(): T | undefined {
		const item = this.inner.extract();

		if (item !== undefined) {
			this.semaphore.release(1);
		}

		return item;
	}

	peek(): T | undefined {
		return this.inner.peek();
	}

	setPriority(item: T, priority: P): boolean {
		return this.inner.setPriority(item, priority);
	}

	/** @see PriorityQueue.remove */
	remove(condition: Predicate<[T, P]>): boolean {
		const removed = this.inner.remove(condition);

		if (removed) {
			this.semaphore.release(1);
		}

		return removed;
	}

	entries(): IterableIterator<PriorityEntry<T, P>> {
		return this.inner.entries();
	}
}
