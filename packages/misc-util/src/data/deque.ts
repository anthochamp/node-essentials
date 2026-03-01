import { LinkedListCollection } from "./_linked-list-collection.js";
import type { IDeque } from "./ideque.js";
import { ListIndexOutOfBoundsError } from "./ilist.js";

/**
 * A double-ended queue (deque) implementation.
 *
 * @template T The type of elements in the deque.
 */
export class Deque<T> extends LinkedListCollection<T> implements IDeque<T> {
	unshift(...items: T[]): void {
		this.data.splice(0, 0, ...items);
	}

	async waitUnshift(
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<void> {
		await this.data.waitSplice(0, 0, items, signal);
	}

	push(...items: T[]): void {
		this.data.splice(this.data.count(), 0, ...items);
	}

	async waitPush(
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<void> {
		await this.data.waitSplice(this.data.count(), 0, items, signal);
	}

	shift(): T | undefined {
		try {
			return this.data.splice(0, 1).next().value;
		} catch (error) {
			if (error instanceof ListIndexOutOfBoundsError) {
				return;
			}
			throw error;
		}
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

	front(): T | undefined {
		return this.data.get(0);
	}

	back(): T | undefined {
		return this.data.get(-1);
	}
}
