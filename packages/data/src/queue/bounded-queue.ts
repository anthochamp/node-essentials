import type { DefinedValue } from "@ac-kit/core";

import {
	checkCapacity,
	resolveBoundedCapacity,
} from "../collection/_bounded.js";
import { BoundedOptions, IBounded } from "../collection/ibounded.js";
import { IQueueStorage } from "../queue/iqueue-storage.js";
import { IQueue } from "./iqueue.js";
import { Queue } from "./queue.js";

export type BoundedQueueOptions<T extends DefinedValue> = BoundedOptions<
	IQueueStorage<T>
>;

/**
 * A FIFO queue that holds at most `capacity` items and throws once full.
 *
 * A fixed-size queue needs no class of its own — hand it a storage that already
 * knows how big it is and the capacity follows:
 *
 * ```ts
 * new BoundedQueue(undefined, {
 * 	storage: new RingVector(undefined, { capacity: 1024 }),
 * });
 * ```
 *
 * @template T The type of elements in the queue.
 */
export class BoundedQueue<T extends DefinedValue>
	implements IQueue<T>, IBounded
{
	private readonly inner: Queue<T>;
	readonly capacity: number;

	constructor(
		iterable: Iterable<T> | undefined,
		options: BoundedQueueOptions<T>,
	) {
		const items = iterable ? Array.from(iterable) : [];

		this.capacity = resolveBoundedCapacity(items.length, options);
		this.inner = new Queue<T>(items, { storage: options.storage });
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

	/**
	 * Same as `IQueue.enqueue`, but throws once the queue is full.
	 *
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the
	 *   queue's capacity.
	 * @see IQueue.enqueue
	 */
	enqueue(item: T): void {
		checkCapacity(this.inner.count(), 1, this.capacity);

		this.inner.enqueue(item);
	}

	/**
	 * Same as `IQueue.enqueueAll`, but throws once the queue is full. Nothing is
	 * added when it throws — the check is made against the whole batch.
	 *
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the
	 *   queue's capacity.
	 * @see IQueue.enqueueAll
	 */
	enqueueAll(items: readonly T[]): void {
		checkCapacity(this.inner.count(), items.length, this.capacity);

		this.inner.enqueueAll(items);
	}

	dequeue(): T | undefined {
		return this.inner.dequeue();
	}

	front(): T | undefined {
		return this.inner.front();
	}
}
