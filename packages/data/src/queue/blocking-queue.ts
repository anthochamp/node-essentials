import type { DefinedValue } from "@ac-kit/core";

import { resolveBoundedCapacity } from "../collection/_bounded.js";
import { CapacitySemaphore } from "../collection/_capacity-semaphore.js";
import { BoundedOptions } from "../collection/ibounded.js";
import { IQueueStorage } from "../queue/iqueue-storage.js";
import { IWaitableQueue } from "./iwaitable-queue.js";
import { Queue } from "./queue.js";

export type BlockingQueueOptions<T extends DefinedValue> = BoundedOptions<
	IQueueStorage<T>
>;

/**
 * A FIFO queue that holds at most `capacity` items, and whose `waitEnqueue`
 * suspends until room frees up instead of throwing.
 *
 * `enqueue` still throws — this type adds a way to wait, it does not change the
 * way to fail. A `capacity` of `0` is legal and never grants room: every
 * `waitEnqueue` blocks until a consumer is there to take the item, which is the
 * rendezvous semantics `@ac-kit/async`'s `Channel` is built on.
 *
 * @template T The type of elements in the queue.
 */
export class BlockingQueue<
	T extends DefinedValue,
> implements IWaitableQueue<T> {
	private readonly inner: Queue<T>;
	private readonly semaphore: CapacitySemaphore;
	readonly capacity: number;

	constructor(
		iterable: Iterable<T> | undefined,
		options: BlockingQueueOptions<T>,
	) {
		const items = iterable ? Array.from(iterable) : [];

		this.capacity = resolveBoundedCapacity(items.length, options);
		this.inner = new Queue<T>(items, { storage: options.storage });
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

	enqueue(item: T): void {
		this.semaphore.tryAcquireOrThrow(1);
		this.inner.enqueue(item);
	}

	enqueueAll(items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		this.semaphore.tryAcquireOrThrow(items.length);
		this.inner.enqueueAll(items);
	}

	async waitEnqueue(item: T, signal?: AbortSignal | null): Promise<void> {
		await this.semaphore.acquire(1, signal);
		this.inner.enqueue(item);
	}

	async waitEnqueueAll(
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<void> {
		const itemsArray = Array.from(items);

		if (itemsArray.length === 0) {
			return;
		}

		await this.semaphore.acquire(itemsArray.length, signal);
		this.inner.enqueueAll(itemsArray);
	}

	dequeue(): T | undefined {
		const item = this.inner.dequeue();

		if (item !== undefined) {
			this.semaphore.release(1);
		}

		return item;
	}

	front(): T | undefined {
		return this.inner.front();
	}
}
