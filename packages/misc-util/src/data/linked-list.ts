import { Semaphore } from "../async/semaphore.js";
import type { Callable, Predicate } from "../ecma/function/types.js";
import { clamp } from "../ecma/math/clamp.js";
import { CollectionCapacityExceededError } from "./abstract-types/icollection.js";
import {
	type IList,
	ListIndexOutOfBoundsError,
} from "./abstract-types/ilist.js";

export type LinkedListNode<T> = {
	value: T;
	next: LinkedListNode<T> | null;
};

/**
 * A "head-tail" linked list implementation.
 *
 * Time complexity:
 * - Access (by index): O(n)
 * - Update (by index): O(n)
 * - Insert: O(1) at head and tail, O(n) otherwise.
 * - Remove: O(1) at head, O(n) otherwise.
 * - Search: O(n)
 * Space complexity: O(n)
 *
 * @template T The type of elements in the list.
 */
export class LinkedList<T> implements IList<T> {
	private head: LinkedListNode<T> | null = null;
	private tail: LinkedListNode<T> | null = null;
	private size: number = 0;
	private readonly semaphore: Semaphore;

	constructor(
		iterable?: Iterable<T>,
		readonly capacity: number = Infinity,
	) {
		const items = iterable ? Array.from(iterable) : [];

		if (items.length > capacity) {
			throw new RangeError("Initial iterable exceeds the specified capacity");
		}

		this.semaphore = new Semaphore(capacity);

		this.splice(0, 0, ...items);
	}

	clear(): void {
		const size = this.size;
		this.head = null;
		this.tail = null;
		this.size = 0;
		this.semaphore.release(size);
	}

	count(): number {
		return this.size;
	}

	*[Symbol.iterator](): Iterator<T> {
		let current = this.head;
		while (current) {
			yield current.value;
			current = current.next;
		}
	}
	async *[Symbol.asyncIterator](): AsyncIterator<T> {
		let current = this.head;
		while (current) {
			yield current.value;
			current = current.next;
		}
	}

	*concat(...items: T[]): IterableIterator<T> {
		yield* this;
		yield* items;
	}

	removeFirst(condition: Predicate<[T]>): boolean {
		let current = this.head;
		let previous: LinkedListNode<T> | null = null;
		while (current) {
			if (condition(current.value)) {
				this.unlinkNode(previous, current);
				return true;
			}
			previous = current;
			current = current.next;
		}
		return false;
	}

	remove(condition: Predicate<[T]>): IterableIterator<T> {
		const removedItems: T[] = [];
		let current = this.head;
		let previous: LinkedListNode<T> | null = null;
		while (current) {
			if (condition(current.value)) {
				removedItems.push(current.value);
				this.unlinkNode(previous, current);

				current = previous ? previous.next : this.head;
			} else {
				previous = current;
				current = current.next;
			}
		}
		return removedItems[Symbol.iterator]();
	}

	replaceFirst(condition: Predicate<[T]>, newItem: T): boolean {
		let current = this.head;
		while (current) {
			if (condition(current.value)) {
				current.value = newItem;
				return true;
			}
			current = current.next;
		}
		return false;
	}

	replace(
		condition: Predicate<[T]>,
		newItemFactory: Callable<[T], T>,
	): IterableIterator<T> {
		const replacedItems: T[] = [];
		let current = this.head;
		while (current) {
			if (condition(current.value)) {
				replacedItems.push(current.value);
				current.value = newItemFactory(current.value);
			}
			current = current.next;
		}
		return replacedItems[Symbol.iterator]();
	}

	get(index: number): T | undefined {
		index = index < 0 ? this.size + index : index;

		return this.getNodeAt(index).current?.value;
	}

	set(index: number, item: T): void {
		index = index < 0 ? this.size + index : index;

		if (index === this.size) {
			if (!this.semaphore.tryAcquire()) {
				throw new CollectionCapacityExceededError(this.capacity);
			}

			this.unprotectedAppendNode(item);
		} else {
			const { current: node } = this.getNodeAt(index);
			if (!node) {
				throw new ListIndexOutOfBoundsError(index, this.size);
			}

			node.value = item;
		}
	}

	async waitSet(
		index: number,
		item: T,
		signal?: AbortSignal | null,
	): Promise<void> {
		index = index < 0 ? this.size + index : index;

		if (index === this.size) {
			await this.semaphore.acquire(1, signal);

			this.unprotectedAppendNode(item);
		} else {
			const { current: node } = this.getNodeAt(index);
			if (!node) {
				throw new ListIndexOutOfBoundsError(index, this.size);
			}

			node.value = item;
		}
	}

	splice(
		start: number,
		deleteCount: number = Infinity,
		...items: T[]
	): IterableIterator<T> {
		start = start < 0 ? this.size + start : start;

		if (start < 0 || start > this.size) {
			throw new ListIndexOutOfBoundsError(start, this.size);
		}

		deleteCount = clamp(deleteCount, 0, this.size - start);

		const toAcquire = items.length - deleteCount;
		if (toAcquire > 0 && !this.semaphore.tryAcquire(toAcquire)) {
			throw new CollectionCapacityExceededError(this.capacity);
		}

		return this.internalSplice(start, deleteCount, -toAcquire, items);
	}

	async waitSplice(
		start: number,
		deleteCount: number = Infinity,
		items?: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<IterableIterator<T>> {
		start = start < 0 ? this.size + start : start;

		if (start < 0 || start > this.size) {
			throw new ListIndexOutOfBoundsError(start, this.size);
		}

		deleteCount = clamp(deleteCount, 0, this.size - start);

		const itemsArray = items ? Array.from(items) : [];

		const toAcquire = itemsArray.length - deleteCount;
		if (toAcquire > 0) {
			await this.semaphore.acquire(toAcquire, signal);
		}

		return this.internalSplice(start, deleteCount, -toAcquire, itemsArray);
	}

	*slice(start: number = 0, end?: number): IterableIterator<T> {
		start = start < 0 ? this.size + start : start;
		end = end === undefined ? this.size : end < 0 ? this.size + end : end;

		if (start < 0 || start >= this.size) {
			throw new ListIndexOutOfBoundsError(start, this.size);
		}

		end = clamp(end, start, this.size);

		let { current } = this.getNodeAt(start);
		let i = start;

		while (current && i < end) {
			yield current.value;
			current = current.next;
			i++;
		}
	}

	private internalSplice(
		computedStart: number,
		computedDeleteCount: number,
		toRelease: number,
		items: T[],
	): IterableIterator<T> {
		let { previous, current } = this.getNodeAt(computedStart);

		const removedItems: T[] = [];

		// Remove deleteCount items
		let toDelete = computedDeleteCount;
		while (toDelete > 0 && current) {
			removedItems.push(current.value);

			current = current.next;
			this.size--;

			if (toRelease > 0) {
				this.semaphore.release(1);
				toRelease--;
			}

			toDelete--;
		}

		// Insert new items
		for (const item of items) {
			const newNode: LinkedListNode<T> = { value: item, next: null };
			if (previous) {
				previous.next = newNode;
			} else {
				this.head = newNode;
			}
			previous = newNode;
			this.size++;
		}

		// Reconnect the tail part
		if (previous) {
			previous.next = current;
		} else {
			this.head = current;
		}

		// Update tail if needed
		if (!current) {
			this.tail = previous;
		}

		return removedItems[Symbol.iterator]();
	}

	private getNodeAt(index: number): {
		previous: LinkedListNode<T> | null;
		current: LinkedListNode<T> | null;
	} {
		if (index < 0 || index > this.size) {
			return { current: null, previous: null };
		}

		if (index === this.size) {
			return { current: null, previous: this.tail };
		}

		let previous: LinkedListNode<T> | null = null;
		let current = this.head;
		let i = 0;
		while (i < index && current) {
			previous = current;
			current = current.next;
			i++;
		}

		return { current, previous: current ? previous : null };
	}

	private unlinkNode(
		previous: LinkedListNode<T> | null,
		node: LinkedListNode<T>,
	): void {
		if (previous) {
			previous.next = node.next;
			if (node === this.tail) {
				this.tail = previous;
			}
		} else {
			this.head = node.next;
			if (node === this.tail) {
				this.tail = null;
			}
		}
		this.size--;
		this.semaphore.release(1);
	}

	private unprotectedAppendNode(item: T): LinkedListNode<T> {
		const newNode: LinkedListNode<T> = { value: item, next: null };
		if (this.tail) {
			this.tail.next = newNode;
		} else {
			this.head = newNode;
		}
		this.tail = newNode;
		this.size++;
		return newNode;
	}
}
