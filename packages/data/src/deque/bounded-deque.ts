import type { DefinedValue } from "@ac-kit/core";

import {
	checkCapacity,
	resolveBoundedCapacity,
} from "../collection/_bounded.js";
import { BoundedOptions, IBounded } from "../collection/ibounded.js";
import { RingVector } from "../storage/ring-vector.js";
import { IDequeStorage } from "./ideque-storage.js";
import { IDeque } from "./ideque.js";

export type BoundedDequeOptions<T extends DefinedValue> = BoundedOptions<
	IDequeStorage<T>
>;

/**
 * A double-ended queue that holds at most `capacity` items and throws once
 * full.
 *
 * @template T The type of elements in the deque.
 */
export class BoundedDeque<T extends DefinedValue>
	implements IDeque<T>, IBounded
{
	private readonly storage: IDequeStorage<T>;
	readonly capacity: number;

	constructor(iterable?: Iterable<T>, options?: BoundedDequeOptions<T>) {
		const items = iterable
			? Array.isArray(iterable)
				? (iterable as T[])
				: Array.from(iterable)
			: [];

		this.capacity = resolveBoundedCapacity(items.length, options);

		if (options?.storage) {
			this.storage = options.storage;

			if (iterable) {
				this.storage.pushBackAll(iterable);
			}
		} else {
			this.storage = new RingVector<T>(iterable, { capacity: this.capacity });
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

	/**
	 * Same as `IDeque.unshift`, but throws once the deque is full.
	 *
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the
	 *   deque's capacity.
	 * @see IDeque.unshift
	 */
	unshift(item: T): void {
		checkCapacity(this.storage.count(), 1, this.capacity);

		this.storage.pushFront(item);
	}

	/**
	 * Same as `IDeque.unshiftAll`, but throws once the deque is full. Nothing is
	 * added when it throws — the check is made against the whole batch.
	 *
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the
	 *   deque's capacity.
	 * @see IDeque.unshiftAll
	 */
	unshiftAll(items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		checkCapacity(this.storage.count(), items.length, this.capacity);

		this.storage.pushFrontAll(items);
	}

	/**
	 * Same as `IDeque.push`, but throws once the deque is full.
	 *
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the
	 *   deque's capacity.
	 * @see IDeque.push
	 */
	push(item: T): void {
		checkCapacity(this.storage.count(), 1, this.capacity);

		this.storage.pushBack(item);
	}

	/**
	 * Same as `IDeque.pushAll`, but throws once the deque is full. Nothing is
	 * added when it throws — the check is made against the whole batch.
	 *
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the
	 *   deque's capacity.
	 * @see IDeque.pushAll
	 */
	pushAll(items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		checkCapacity(this.storage.count(), items.length, this.capacity);

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
