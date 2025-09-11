import { ListIndexOutOfBoundsError } from "./abstract-types/ilist.js";
import type { IQueue } from "./abstract-types/iqueue.js";
import { LinkedListCollection } from "./collection-base/linked-list-collection.js";

/**
 * A FIFO queue implementation.
 *
 * @template T The type of elements in the queue.
 */
export class Queue<T> extends LinkedListCollection<T> implements IQueue<T> {
	enqueue(...items: T[]): void {
		this.data.splice(this.data.count(), 0, ...items);
	}

	async waitEnqueue(
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<void> {
		await this.data.waitSplice(this.data.count(), 0, items, signal);
	}

	dequeue(): T | undefined {
		try {
			return this.data.splice(0, 1).next().value;
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
}
