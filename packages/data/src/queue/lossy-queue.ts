import { isFinitePositive, type DefinedValue } from "@ac-kit/core";

import { OverflowPolicy } from "../collection/ilossy.js";
import { IQueueStorage } from "../queue/iqueue-storage.js";
import { RingVector } from "../storage/ring-vector.js";
import { ILossyQueue } from "./ilossy-queue.js";

const NOTHING_EVICTED: readonly never[] = Object.freeze([]);

export type LossyQueueOptions<T extends DefinedValue> = {
	capacity: number;
	overflowPolicy?: OverflowPolicy;
	storage?: IQueueStorage<T>;
};

/**
 * A FIFO queue that never throws or waits on an over-capacity `enqueue`,
 * evicting the front (oldest) item — or skipping the incoming one — instead.
 *
 * `capacity` has no default: an unbounded lossy queue can never fill up, so
 * `overflowPolicy` would never apply, defeating the entire point of this type.
 * A caller wanting an unbounded FIFO should use {@link Queue}.
 *
 * @template T The type of elements in the queue.
 */
export class LossyQueue<T extends DefinedValue> implements ILossyQueue<T> {
	private readonly storage: IQueueStorage<T>;
	readonly capacity: number;
	readonly overflowPolicy: OverflowPolicy;

	constructor(
		iterable: Iterable<T> | undefined,
		options: LossyQueueOptions<T>,
	) {
		if (!isFinitePositive(options.capacity)) {
			throw new RangeError("LossyQueue requires a positive capacity");
		}

		this.capacity = options.capacity;
		this.overflowPolicy = options.overflowPolicy ?? "evict";
		this.storage = options.storage ?? new RingVector<T>();

		if (iterable) {
			this.enqueueAll(Array.from(iterable));
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

	enqueue(item: T): readonly T[] {
		if (this.storage.count() < this.capacity) {
			this.storage.pushBack(item);
			return NOTHING_EVICTED;
		}

		if (this.overflowPolicy === "skip") {
			return [item];
		}

		const droppedFront = this.storage.popFront();
		this.storage.pushBack(item);

		return droppedFront === undefined ? NOTHING_EVICTED : [droppedFront];
	}

	enqueueAll(items: readonly T[]): readonly T[] {
		let evicted: T[] | undefined;

		for (let index = 0; index < items.length; index++) {
			const item = items[index]!;

			if (this.storage.count() >= this.capacity) {
				if (this.overflowPolicy === "skip") {
					(evicted ??= []).push(item);
					continue;
				}

				const droppedFront = this.storage.popFront();
				if (droppedFront !== undefined) {
					(evicted ??= []).push(droppedFront);
				}
			}

			this.storage.pushBack(item);
		}

		return evicted ?? NOTHING_EVICTED;
	}

	dequeue(): T | undefined {
		return this.storage.popFront();
	}

	front(): T | undefined {
		return this.storage.front();
	}
}
