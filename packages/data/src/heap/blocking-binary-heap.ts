import type { DefinedValue, OrderPredicate } from "@ac-kit/core";

import { resolveBoundedCapacity } from "../collection/_bounded.js";
import { CapacitySemaphore } from "../collection/_capacity-semaphore.js";
import { BoundedOptions } from "../collection/ibounded.js";
import { BinaryHeap } from "./binary-heap.js";
import { HeapStorage } from "./iheap-storage.js";
import { IWaitableHeap } from "./iwaitable-heap.js";

export type BlockingBinaryHeapOptions<T extends DefinedValue> = BoundedOptions<
	HeapStorage<T>
>;

/**
 * A binary heap that holds at most `capacity` items, and whose `waitInsert`
 * suspends until room frees up instead of throwing.
 *
 * `insert` still throws — this type adds a way to wait, it does not change the
 * way to fail.
 *
 * @template T The type of elements in the heap.
 */
export class BlockingBinaryHeap<
	T extends DefinedValue,
> implements IWaitableHeap<T> {
	private readonly inner: BinaryHeap<T>;
	private readonly semaphore: CapacitySemaphore;
	readonly capacity: number;

	constructor(
		readonly precedes: OrderPredicate<T>,
		iterable: Iterable<T> | undefined,
		options: BlockingBinaryHeapOptions<T>,
	) {
		const items = iterable ? Array.from(iterable) : [];

		this.capacity = resolveBoundedCapacity(items.length, options);
		this.inner = new BinaryHeap<T>(precedes, items, {
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

	insert(item: T): void {
		this.semaphore.tryAcquireOrThrow(1);
		this.inner.insert(item);
	}

	insertAll(items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		this.semaphore.tryAcquireOrThrow(items.length);
		this.inner.insertAll(items);
	}

	async waitInsert(item: T, signal?: AbortSignal | null): Promise<void> {
		await this.semaphore.acquire(1, signal);
		this.inner.insert(item);
	}

	async waitInsertAll(
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<void> {
		const itemsArray = Array.from(items);

		if (itemsArray.length === 0) {
			return;
		}

		await this.semaphore.acquire(itemsArray.length, signal);
		this.inner.insertAll(itemsArray);
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

	/** Net-zero on the element count, so no permit changes hands. */
	insertAndExtract(item: T): T | undefined {
		return this.inner.insertAndExtract(item);
	}

	extractAndInsert(item: T): T | undefined {
		// Net-zero except on an empty heap, where there is no root to extract and
		// the item is simply inserted.
		if (this.inner.count() === 0) {
			this.semaphore.tryAcquireOrThrow(1);
		}

		return this.inner.extractAndInsert(item);
	}
}
