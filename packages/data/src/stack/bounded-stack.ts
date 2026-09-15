import type { DefinedValue } from "@ac-kit/core";

import {
	checkCapacity,
	resolveBoundedCapacity,
} from "../collection/_bounded.js";
import { BoundedOptions, IBounded } from "../collection/ibounded.js";
import { IStackStorage } from "../stack/istack-storage.js";
import { IStack } from "./istack.js";
import { Stack } from "./stack.js";

export type BoundedStackOptions<T extends DefinedValue> = BoundedOptions<
	IStackStorage<T>
>;

/**
 * A LIFO stack that holds at most `capacity` items and throws once full.
 *
 * @template T The type of elements in the stack.
 */
export class BoundedStack<T extends DefinedValue>
	implements IStack<T>, IBounded
{
	private readonly inner: Stack<T>;
	readonly capacity: number;

	constructor(
		iterable: Iterable<T> | undefined,
		options: BoundedStackOptions<T>,
	) {
		const items = iterable ? Array.from(iterable) : [];

		this.capacity = resolveBoundedCapacity(items.length, options);
		this.inner = new Stack<T>(items, { storage: options.storage });
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
	 * Same as `IStack.push`, but throws once the stack is full.
	 *
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the
	 *   stack's capacity.
	 * @see IStack.push
	 */
	push(item: T): void {
		checkCapacity(this.inner.count(), 1, this.capacity);

		this.inner.push(item);
	}

	/**
	 * Same as `IStack.pushAll`, but throws once the stack is full. Nothing is
	 * added when it throws — the check is made against the whole batch.
	 *
	 * @throws {CollectionCapacityExceededError} If the operation would exceed the
	 *   stack's capacity.
	 * @see IStack.pushAll
	 */
	pushAll(items: readonly T[]): void {
		checkCapacity(this.inner.count(), items.length, this.capacity);

		this.inner.pushAll(items);
	}

	pop(): T | undefined {
		return this.inner.pop();
	}

	top(): T | undefined {
		return this.inner.top();
	}
}
