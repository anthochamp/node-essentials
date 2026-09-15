import type { DefinedValue, OrderPredicate } from "@ac-kit/core";

import { RingVector } from "../storage/ring-vector.js";
import { heapifyAll, heapifyDown, heapifyUp } from "./_array-heap.js";
import { HeapStorage } from "./iheap-storage.js";
import type { IHeap } from "./iheap.js";

export type BinaryHeapOptions<T extends DefinedValue> = {
	storage?: HeapStorage<T>;
};

/**
 * An unbounded binary heap.
 *
 * For a capacity, use `BoundedBinaryHeap` (throws when full) or
 * `BlockingBinaryHeap` (waits).
 *
 * @template T The type of elements in the heap.
 */
export class BinaryHeap<T extends DefinedValue> implements IHeap<T> {
	private readonly storage: HeapStorage<T>;

	constructor(
		readonly precedes: OrderPredicate<T>,
		iterable?: Iterable<T>,
		options?: BinaryHeapOptions<T>,
	) {
		this.storage = options?.storage ?? new RingVector<T>();

		if (iterable) {
			for (const item of iterable) {
				this.storage.pushBack(item);
			}
		}

		heapifyAll(this.storage, this.precedes);
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

	insert(item: T): void {
		this.storage.pushBack(item);
		heapifyUp(this.storage, this.storage.count() - 1, this.precedes);
	}

	insertAll(items: readonly T[]): void {
		for (let index = 0; index < items.length; index++) {
			this.storage.pushBack(items[index]!);
			heapifyUp(this.storage, this.storage.count() - 1, this.precedes);
		}
	}

	extract(): T | undefined {
		const count = this.storage.count();

		if (count === 0) {
			return undefined;
		}

		if (count === 1) {
			return this.storage.popBack();
		}

		const root = this.peek();
		const last = this.storage.popBack() as T;
		this.storage.set(0, last);
		heapifyDown(this.storage, 0, this.storage.count(), this.precedes);
		return root;
	}

	insertAndExtract(item: T): T | undefined {
		const root = this.peek();

		if (root === undefined) {
			return item;
		}

		if (this.precedes(item, root)) {
			return item;
		}

		this.storage.set(0, item);
		heapifyDown(this.storage, 0, this.storage.count(), this.precedes);
		return root;
	}

	extractAndInsert(item: T): T | undefined {
		if (this.storage.count() === 0) {
			this.storage.pushBack(item);
			return undefined;
		}

		const root = this.peek();
		this.storage.set(0, item);
		heapifyDown(this.storage, 0, this.storage.count(), this.precedes);
		return root;
	}

	peek(): T | undefined {
		return this.storage.get(0);
	}
}
