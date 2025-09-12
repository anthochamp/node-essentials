import { ListIndexOutOfBoundsError } from "./abstract-types/ilist.js";
import type { IStack } from "./abstract-types/istack.js";
import { NativeListCollection } from "./collection-base/native-array-collection.js";

/**
 * The LIFO stack implementation.
 *
 * @template T The type of elements in the stack.
 */
export class Stack<T> extends NativeListCollection<T> implements IStack<T> {
	push(...items: T[]): void {
		this.data.splice(this.data.count(), 0, ...items);
	}

	async waitPush(
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<void> {
		await this.data.waitSplice(this.data.count(), 0, items, signal);
	}

	pop(): T | undefined {
		try {
			return this.data.splice(-1, 1).next().value;
		} catch (error) {
			if (error instanceof ListIndexOutOfBoundsError) {
				return;
			}

			throw error;
		}
	}

	top(): T | undefined {
		return this.data.get(-1);
	}
}
