import type { DefinedValue, OrderPredicate, Predicate } from "@ac-kit/core";

import { heapifyAll, heapifyDown, heapifyUp } from "../heap/_array-heap.js";
import { HeapStorage } from "../heap/iheap-storage.js";
import { RingVector } from "../storage/ring-vector.js";
import { IPriorityQueue, PriorityEntry } from "./ipriority-queue.js";

export type PriorityQueueOptions<T extends DefinedValue, P> = {
	storage?: HeapStorage<PriorityEntry<T, P>>;
};

/**
 * An unbounded priority queue.
 *
 * For a capacity, use `BoundedPriorityQueue` (throws when full) or
 * `BlockingPriorityQueue` (waits).
 *
 * @template T The type of elements in the priority queue.
 * @template P The type of priority associated with each element.
 */
export class PriorityQueue<
	T extends DefinedValue,
	P = number,
> implements IPriorityQueue<T, P> {
	private readonly storage: HeapStorage<PriorityEntry<T, P>>;
	private readonly entryPrecedes: OrderPredicate<PriorityEntry<T, P>>;

	constructor(
		readonly precedes: OrderPredicate<P> = (a, b) => a < b,
		iterable?: Iterable<[T, P]>,
		options?: PriorityQueueOptions<T, P>,
	) {
		this.entryPrecedes = (a, b) => this.precedes(a.priority, b.priority);
		this.storage = options?.storage ?? new RingVector<PriorityEntry<T, P>>();

		if (iterable) {
			for (const [value, priority] of iterable) {
				this.storage.pushBack({ value, priority });
			}
		}

		heapifyAll(this.storage, this.entryPrecedes);
	}

	*[Symbol.iterator](): Iterator<T> {
		for (const entry of this.storage) {
			yield entry.value;
		}
	}

	clear(): void {
		this.storage.clear();
	}

	count(): number {
		return this.storage.count();
	}

	insert(priority: P, value: T): void {
		this.storage.pushBack({ value, priority });
		heapifyUp(this.storage, this.storage.count() - 1, this.entryPrecedes);
	}

	insertAll(priority: P, items: readonly T[]): void {
		for (let index = 0; index < items.length; index++) {
			this.storage.pushBack({ value: items[index]!, priority });
			heapifyUp(this.storage, this.storage.count() - 1, this.entryPrecedes);
		}
	}

	extract(): T | undefined {
		const count = this.storage.count();

		if (count === 0) {
			return undefined;
		}

		if (count === 1) {
			return this.storage.popBack()?.value;
		}

		const root = this.storage.get(0);
		const last = this.storage.popBack() as PriorityEntry<T, P>;
		this.storage.set(0, last);
		heapifyDown(this.storage, 0, this.storage.count(), this.entryPrecedes);
		return root?.value;
	}

	peek(): T | undefined {
		return this.storage.get(0)?.value;
	}

	setPriority(item: T, priority: P): boolean {
		for (let index = 0; index < this.storage.count(); index++) {
			const entry = this.storage.get(index);

			if (entry !== undefined && entry.value === item) {
				const previousPriority = entry.priority;
				this.storage.set(index, { value: item, priority });

				if (this.precedes(priority, previousPriority)) {
					heapifyUp(this.storage, index, this.entryPrecedes);
				} else {
					heapifyDown(
						this.storage,
						index,
						this.storage.count(),
						this.entryPrecedes,
					);
				}

				return true;
			}
		}

		return false;
	}

	/**
	 * Removes the first entry matching `condition`, restoring the heap property
	 * afterward.
	 *
	 * Not part of `IPriorityQueue` — reaching into the middle of a priority queue
	 * by value is a real, occasionally needed capability (e.g. unregistering a
	 * previously inserted handler), but not one every consumer needs, matching
	 * the extra `removeFirst`-style surface the list classes carry beyond their
	 * own slim interfaces.
	 *
	 * @param condition A predicate over an entry's value and priority.
	 * @returns `true` if a matching entry was found and removed.
	 */
	remove(condition: Predicate<[T, P]>): boolean {
		for (let index = 0; index < this.storage.count(); index++) {
			const entry = this.storage.get(index);

			if (entry !== undefined && condition(entry.value, entry.priority)) {
				const lastIndex = this.storage.count() - 1;

				if (index === lastIndex) {
					this.storage.popBack();
				} else {
					const last = this.storage.popBack() as PriorityEntry<T, P>;
					this.storage.set(index, last);
					heapifyDown(
						this.storage,
						index,
						this.storage.count(),
						this.entryPrecedes,
					);
					heapifyUp(this.storage, index, this.entryPrecedes);
				}

				return true;
			}
		}

		return false;
	}

	/**
	 * Drains a copy of the heap in priority order, leaving this queue untouched —
	 * the storage's own iteration order is heap order, not priority order.
	 */
	*entries(): IterableIterator<PriorityEntry<T, P>> {
		const drain = new RingVector<PriorityEntry<T, P>>(this.storage);

		while (drain.count() > 0) {
			const count = drain.count();

			if (count === 1) {
				yield drain.popBack() as PriorityEntry<T, P>;
				break;
			}

			const root = drain.get(0) as PriorityEntry<T, P>;
			const last = drain.popBack() as PriorityEntry<T, P>;
			drain.set(0, last);
			heapifyDown(drain, 0, drain.count(), this.entryPrecedes);
			yield root;
		}
	}
}
