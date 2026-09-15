import type { DefinedValue, OrderPredicate, Predicate } from "@ac-kit/core";

import {
	checkCapacity,
	resolveBoundedCapacity,
} from "../collection/_bounded.js";
import { BoundedOptions, IBounded } from "../collection/ibounded.js";
import { HeapStorage } from "../heap/iheap-storage.js";
import type { IPriorityQueue, PriorityEntry } from "./ipriority-queue.js";
import { PriorityQueue } from "./priority-queue.js";

export type BoundedPriorityQueueOptions<
	T extends DefinedValue,
	P,
> = BoundedOptions<HeapStorage<PriorityEntry<T, P>>>;

/**
 * A priority queue that holds at most `capacity` items and throws once full.
 *
 * @template T The type of elements in the priority queue.
 * @template P The type of priority associated with each element.
 */
export class BoundedPriorityQueue<T extends DefinedValue, P = number>
	implements IPriorityQueue<T, P>, IBounded
{
	private readonly inner: PriorityQueue<T, P>;
	readonly capacity: number;

	constructor(
		readonly precedes: OrderPredicate<P> = (a, b) => a < b,
		iterable: Iterable<[T, P]> | undefined,
		options: BoundedPriorityQueueOptions<T, P>,
	) {
		const items = iterable ? Array.from(iterable) : [];

		this.capacity = resolveBoundedCapacity(items.length, options);
		this.inner = new PriorityQueue<T, P>(precedes, items, {
			storage: options.storage,
		});
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
	 * Same as `IPriorityQueue.insert`, but throws once the queue is full.
	 *
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the
	 *   queue's capacity.
	 * @see IPriorityQueue.insert
	 */
	insert(priority: P, item: T): void {
		checkCapacity(this.inner.count(), 1, this.capacity);

		this.inner.insert(priority, item);
	}

	/**
	 * Same as `IPriorityQueue.insertAll`, but throws once the queue is full.
	 * Nothing is inserted when it throws — the check is made against the whole
	 * batch.
	 *
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the
	 *   queue's capacity.
	 * @see IPriorityQueue.insertAll
	 */
	insertAll(priority: P, items: readonly T[]): void {
		checkCapacity(this.inner.count(), items.length, this.capacity);

		this.inner.insertAll(priority, items);
	}

	extract(): T | undefined {
		return this.inner.extract();
	}

	peek(): T | undefined {
		return this.inner.peek();
	}

	setPriority(item: T, priority: P): boolean {
		return this.inner.setPriority(item, priority);
	}

	/** @see PriorityQueue.remove */
	remove(condition: Predicate<[T, P]>): boolean {
		return this.inner.remove(condition);
	}

	entries(): IterableIterator<PriorityEntry<T, P>> {
		return this.inner.entries();
	}
}
