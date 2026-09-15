import type { DefinedValue } from "@ac-kit/core";

import { IQueueStorage } from "../queue/iqueue-storage.js";
import { RingVector } from "../storage/ring-vector.js";
import { IQueue } from "./iqueue.js";

export type QueueOptions<T extends DefinedValue> = {
	storage?: IQueueStorage<T>;
};

/**
 * An unbounded FIFO queue.
 *
 * For a capacity, use `BoundedQueue` (throws when full), `BlockingQueue`
 * (waits) or `LossyQueue` (evicts) — one class per answer to "what happens when
 * it is full", rather than one class with a flag.
 *
 * @template T The type of elements in the queue.
 */
export class Queue<T extends DefinedValue> implements IQueue<T> {
	private readonly storage: IQueueStorage<T>;

	constructor(iterable?: Iterable<T>, options?: QueueOptions<T>) {
		this.storage = options?.storage ?? new RingVector<T>();

		if (iterable) {
			for (const item of iterable) {
				this.storage.pushBack(item);
			}
		}
	}

	[Symbol.iterator](): Iterator<T> {
		return this.storage[Symbol.iterator]();
	}

	clear(): void {
		this.storage.clear();
	}

	count(): number {
		return this.storage.count();
	}

	enqueue(item: T): void {
		this.storage.pushBack(item);
	}

	enqueueAll(items: readonly T[]): void {
		this.storage.pushBackAll(items);
	}

	dequeue(): T | undefined {
		return this.storage.popFront();
	}

	front(): T | undefined {
		return this.storage.front();
	}
}
