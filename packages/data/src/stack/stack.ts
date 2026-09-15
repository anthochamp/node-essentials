import type { DefinedValue } from "@ac-kit/core";

import { IStackStorage } from "../stack/istack-storage.js";
import { RingVector } from "../storage/ring-vector.js";
import { IStack } from "./istack.js";

export type StackOptions<T extends DefinedValue> = {
	storage?: IStackStorage<T>;
};

/**
 * An unbounded LIFO stack.
 *
 * For a capacity, use `BoundedStack` (throws when full) or `BlockingStack`
 * (waits).
 *
 * @template T The type of elements in the stack.
 */
export class Stack<T extends DefinedValue> implements IStack<T> {
	private readonly storage: IStackStorage<T>;

	constructor(iterable?: Iterable<T>, options?: StackOptions<T>) {
		this.storage = options?.storage ?? new RingVector<T>();

		if (iterable) {
			for (const item of iterable) {
				this.storage.pushBack(item);
			}
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

	push(item: T): void {
		this.storage.pushBack(item);
	}

	pushAll(items: readonly T[]): void {
		this.storage.pushBackAll(items);
	}

	pop(): T | undefined {
		return this.storage.popBack();
	}

	top(): T | undefined {
		return this.storage.back();
	}
}
