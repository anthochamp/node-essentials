import type { DefinedValue } from "@ac-kit/core";

import { resolveBoundedCapacity } from "../collection/_bounded.js";
import { CapacitySemaphore } from "../collection/_capacity-semaphore.js";
import { BoundedOptions } from "../collection/ibounded.js";
import { IStackStorage } from "../stack/istack-storage.js";
import { IWaitableStack } from "./iwaitable-stack.js";
import { Stack } from "./stack.js";

export type BlockingStackOptions<T extends DefinedValue> = BoundedOptions<
	IStackStorage<T>
>;

/**
 * A LIFO stack that holds at most `capacity` items, and whose `waitPush`
 * suspends until room frees up instead of throwing.
 *
 * `push` still throws — this type adds a way to wait, it does not change the
 * way to fail.
 *
 * @template T The type of elements in the stack.
 */
export class BlockingStack<
	T extends DefinedValue,
> implements IWaitableStack<T> {
	private readonly inner: Stack<T>;
	private readonly semaphore: CapacitySemaphore;
	readonly capacity: number;

	constructor(
		iterable: Iterable<T> | undefined,
		options: BlockingStackOptions<T>,
	) {
		const items = iterable ? Array.from(iterable) : [];

		this.capacity = resolveBoundedCapacity(items.length, options);
		this.inner = new Stack<T>(items, { storage: options.storage });
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

	pop(): T | undefined {
		const item = this.inner.pop();

		if (item !== undefined) {
			this.semaphore.release(1);
		}

		return item;
	}

	top(): T | undefined {
		return this.inner.top();
	}
}
