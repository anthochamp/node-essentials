import type { DefinedValue } from "@ac-kit/core";

import { RingVector } from "../storage/ring-vector.js";
import { IDequeStorage } from "./ideque-storage.js";
import { IDeque } from "./ideque.js";

export type DequeOptions<T extends DefinedValue> = {
	storage?: IDequeStorage<T>;
};

/**
 * An unbounded double-ended queue.
 *
 * Backed by {@link RingVector} — one flat wrap-around array, so both ends are
 * O(1) with no per-element node allocation. `DoublyLinkedList` also satisfies
 * `DequeStorage` and is the right choice when elements must survive being
 * spliced out of the middle; it is not the right default.
 *
 * For a capacity, use `BoundedDeque` (throws when full) or `BlockingDeque`
 * (waits).
 *
 * @template T The type of elements in the deque.
 */
export class Deque<T extends DefinedValue> implements IDeque<T> {
	private readonly storage: IDequeStorage<T>;

	constructor(iterable?: Iterable<T>, options?: DequeOptions<T>) {
		if (options?.storage) {
			this.storage = options.storage;

			if (iterable) {
				this.storage.pushBackAll(iterable);
			}
		} else {
			this.storage = new RingVector<T>(iterable);
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

	unshift(item: T): void {
		this.storage.pushFront(item);
	}

	unshiftAll(items: readonly T[]): void {
		this.storage.pushFrontAll(items);
	}

	push(item: T): void {
		this.storage.pushBack(item);
	}

	pushAll(items: readonly T[]): void {
		this.storage.pushBackAll(items);
	}

	shift(): T | undefined {
		return this.storage.popFront();
	}

	pop(): T | undefined {
		return this.storage.popBack();
	}

	front(): T | undefined {
		return this.storage.front();
	}

	back(): T | undefined {
		return this.storage.back();
	}
}
