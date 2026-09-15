import type { DefinedValue } from "@ac-kit/core";

import { resolveBoundedCapacity } from "../collection/_bounded.js";
import { CapacitySemaphore } from "../collection/_capacity-semaphore.js";
import { BoundedOptions } from "../collection/ibounded.js";
import { Deque } from "./deque.js";
import { IDequeStorage } from "./ideque-storage.js";
import { IWaitableDeque } from "./iwaitable-deque.js";

export type BlockingDequeOptions<T extends DefinedValue> = BoundedOptions<
	IDequeStorage<T>
>;

/**
 * A double-ended queue that holds at most `capacity` items, and whose
 * `waitUnshift`/`waitPush` suspend until room frees up instead of throwing.
 *
 * `unshift` and `push` still throw — this type adds a way to wait, it does not
 * change the way to fail.
 *
 * @template T The type of elements in the deque.
 */
export class BlockingDeque<
	T extends DefinedValue,
> implements IWaitableDeque<T> {
	private readonly inner: Deque<T>;
	private readonly semaphore: CapacitySemaphore;
	readonly capacity: number;

	constructor(
		iterable: Iterable<T> | undefined,
		options: BlockingDequeOptions<T>,
	) {
		const items = iterable ? Array.from(iterable) : [];

		this.capacity = resolveBoundedCapacity(items.length, options);
		this.inner = new Deque<T>(items, { storage: options.storage });
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

	unshift(item: T): void {
		this.semaphore.tryAcquireOrThrow(1);

		this.inner.unshift(item);
	}

	unshiftAll(items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		this.semaphore.tryAcquireOrThrow(items.length);

		this.inner.unshiftAll(items);
	}

	async waitUnshift(item: T, signal?: AbortSignal | null): Promise<void> {
		await this.semaphore.acquire(1, signal);

		this.inner.unshift(item);
	}

	async waitUnshiftAll(
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<void> {
		const itemsArray = Array.from(items);

		if (itemsArray.length === 0) {
			return;
		}

		await this.semaphore.acquire(itemsArray.length, signal);

		this.inner.unshiftAll(itemsArray);
	}

	push(item: T): void {
		this.semaphore.tryAcquireOrThrow(1);
		this.inner.push(item);
	}

	pushAll(items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		this.semaphore.tryAcquireOrThrow(items.length);

		this.inner.pushAll(items);
	}

	async waitPush(item: T, signal?: AbortSignal | null): Promise<void> {
		await this.semaphore.acquire(1, signal);

		this.inner.push(item);
	}

	async waitPushAll(
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<void> {
		const itemsArray = Array.from(items);

		if (itemsArray.length === 0) {
			return;
		}

		await this.semaphore.acquire(itemsArray.length, signal);

		this.inner.pushAll(itemsArray);
	}

	shift(): T | undefined {
		const item = this.inner.shift();

		if (item !== undefined) {
			this.semaphore.release(1);
		}

		return item;
	}

	pop(): T | undefined {
		const item = this.inner.pop();

		if (item !== undefined) {
			this.semaphore.release(1);
		}

		return item;
	}

	front(): T | undefined {
		return this.inner.front();
	}

	back(): T | undefined {
		return this.inner.back();
	}
}
