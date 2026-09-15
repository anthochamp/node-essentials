import type { DefinedValue, OrderPredicate } from "@ac-kit/core";

import {
	checkCapacity,
	resolveBoundedCapacity,
} from "../collection/_bounded.js";
import { BoundedOptions, IBounded } from "../collection/ibounded.js";
import { BinaryHeap } from "./binary-heap.js";
import { HeapStorage } from "./iheap-storage.js";
import { IHeap } from "./iheap.js";

export type BoundedBinaryHeapOptions<T extends DefinedValue> = BoundedOptions<
	HeapStorage<T>
>;

/**
 * A binary heap that holds at most `capacity` items and throws once full.
 *
 * @template T The type of elements in the heap.
 */
export class BoundedBinaryHeap<T extends DefinedValue>
	implements IHeap<T>, IBounded
{
	private readonly inner: BinaryHeap<T>;
	readonly capacity: number;

	constructor(
		readonly precedes: OrderPredicate<T>,
		iterable: Iterable<T> | undefined,
		options: BoundedBinaryHeapOptions<T>,
	) {
		const items = iterable ? Array.from(iterable) : [];

		this.capacity = resolveBoundedCapacity(items.length, options);
		this.inner = new BinaryHeap<T>(precedes, items, {
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
	 * Same as `IHeap.insert`, but throws once the heap is full.
	 *
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the
	 *   heap's capacity.
	 * @see IHeap.insert
	 */
	insert(item: T): void {
		checkCapacity(this.inner.count(), 1, this.capacity);

		this.inner.insert(item);
	}

	/**
	 * Same as `IHeap.insertAll`, but throws once the heap is full. Nothing is
	 * inserted when it throws — the check is made against the whole batch.
	 *
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the
	 *   heap's capacity.
	 * @see IHeap.insertAll
	 */
	insertAll(items: readonly T[]): void {
		checkCapacity(this.inner.count(), items.length, this.capacity);

		this.inner.insertAll(items);
	}

	extract(): T | undefined {
		return this.inner.extract();
	}

	peek(): T | undefined {
		return this.inner.peek();
	}

	/** Net-zero on the element count, so no capacity check is needed. */
	insertAndExtract(item: T): T | undefined {
		return this.inner.insertAndExtract(item);
	}

	extractAndInsert(item: T): T | undefined {
		// Net-zero except on an empty heap, where there is no root to extract and
		// the item is simply inserted.
		if (this.inner.count() === 0) {
			checkCapacity(0, 1, this.capacity);
		}

		return this.inner.extractAndInsert(item);
	}
}
