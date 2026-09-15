import {
	clamp,
	type Callable,
	type DefinedValue,
	type Predicate,
} from "@ac-kit/core";

import { ICursorSequence } from "../cursor/icursor-sequence.js";
import type { ICursor } from "../cursor/icursor.js";
import { IPopFrontStorage } from "../storage/ipop-front-storage.js";
import { IPushBackStorage } from "../storage/ipush-back-storage.js";
import { IList, ListIndexOutOfBoundsError } from "./ilist.js";

export type LinkedListNode_<T> = {
	value: T;
	next: LinkedListNode_<T> | null;
	/** Set once this node is unlinked — what a cursor's `valid` checks. */
	removed?: boolean;
};

/**
 * A cursor over a {@link LinkedList}.
 *
 * Forward-only, matching what a singly-linked list can honour in O(1): there is
 * no `retreat`, and `insertAfter`/`removeAfter` operate on the node this cursor
 * points at without walking the list from the head.
 *
 * A cursor's element was removed — by any means, not just through this cursor —
 * is exactly when `valid` becomes `false`; the underlying node is marked on
 * removal, and every cursor still referencing it observes that mark. A cursor
 * obtained from `end()` has no node of its own: `insertAfter` on it appends,
 * reading the list's current tail live, so it never goes stale even if other
 * insertions/removals happen first.
 *
 * @template T The type of elements in the list.
 */
export class LinkedListCursor<T extends DefinedValue> implements ICursor<T> {
	constructor(
		private readonly list: LinkedList<T>,
		private node: LinkedListNode_<T> | null,
	) {}

	get valid(): boolean {
		return this.node !== null && !this.node.removed;
	}

	get value(): T | undefined {
		return this.valid ? this.node!.value : undefined;
	}

	advance(): boolean {
		if (!this.valid) {
			return false;
		}

		this.node = this.node!.next;
		return this.valid;
	}

	clone(): LinkedListCursor<T> {
		return new LinkedListCursor(this.list, this.node);
	}

	/** @internal Used by `LinkedList`'s cursor-sequence methods only. */
	_node(): LinkedListNode_<T> | null {
		return this.node;
	}
}

/**
 * A "head-tail" linked list implementation.
 *
 * Time complexity: - Access (by index): O(n) - Update (by index): O(n) -
 * Insert: O(1) at head and tail, O(n) otherwise. - Remove: O(1) at head, O(n)
 * otherwise. - Search: O(n) Space complexity: O(n)
 *
 * `popBack` is deliberately not declared — unlinking the tail of a
 * singly-linked list is Θ(n). See `DoublyLinkedList` for O(1) at both ends.
 *
 * Unbounded. For a capacity, wrap it in `BoundedLinkedList` or
 * `BlockingLinkedList`.
 *
 * @template T The type of elements in the list.
 */
export class LinkedList<T extends DefinedValue>
	implements
		IList<T>,
		IPushBackStorage<T>,
		IPopFrontStorage<T>,
		ICursorSequence<T, LinkedListCursor<T>>
{
	private head: LinkedListNode_<T> | null = null;
	private tail: LinkedListNode_<T> | null = null;
	private size: number = 0;

	constructor(iterable?: Iterable<T>) {
		if (iterable) {
			for (const item of iterable) {
				this.unprotectedAppendNode(item);
			}
		}
	}

	clear(): void {
		this.head = null;
		this.tail = null;
		this.size = 0;
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

	removeFirst(condition: Predicate<[T]>): boolean {
		let current = this.head;
		let previous: LinkedListNode_<T> | null = null;
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
		let previous: LinkedListNode_<T> | null = null;
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

	pushBack(item: T): void {
		this.unprotectedAppendNode(item);
	}

	pushBackAll(items: readonly T[]): void {
		for (let i = 0; i < items.length; i++) {
			this.unprotectedAppendNode(items[i]!);
		}
	}

	popFront(): T | undefined {
		const node = this.head;

		if (!node) {
			return undefined;
		}

		node.removed = true;
		this.head = node.next;
		if (node === this.tail) {
			this.tail = null;
		}
		this.size--;

		return node.value;
	}

	front(): T | undefined {
		return this.head?.value;
	}

	set(index: number, item: T): void {
		index = index < 0 ? this.size + index : index;

		if (index === this.size) {
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
		item?: T,
	): IterableIterator<T> {
		return this.spliceAll(
			start,
			deleteCount,
			item === undefined ? undefined : [item],
		);
	}

	spliceAll(
		start: number,
		deleteCount: number = Infinity,
		items: readonly T[] = [],
	): IterableIterator<T> {
		start = start < 0 ? this.size + start : start;

		if (start < 0 || start > this.size) {
			throw new ListIndexOutOfBoundsError(start, this.size);
		}

		deleteCount = clamp(deleteCount, 0, this.size - start);

		return this.internalSplice(start, deleteCount, items);
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
		items: readonly T[],
	): IterableIterator<T> {
		let { previous, current } = this.getNodeAt(computedStart);

		const removedItems: T[] = [];
		// Remove deleteCount items
		let toDelete = computedDeleteCount;
		while (toDelete > 0 && current) {
			removedItems.push(current.value);
			current.removed = true;

			current = current.next;
			this.size--;

			toDelete--;
		}

		this.linkItemsAfter(previous, current, items);

		return removedItems[Symbol.iterator]();
	}

	private getNodeAt(index: number): {
		previous: LinkedListNode_<T> | null;
		current: LinkedListNode_<T> | null;
	} {
		if (index < 0 || index > this.size) {
			return { current: null, previous: null };
		}

		if (index === this.size) {
			return { current: null, previous: this.tail };
		}

		let previous: LinkedListNode_<T> | null = null;
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
		previous: LinkedListNode_<T> | null,
		node: LinkedListNode_<T>,
	): void {
		node.removed = true;

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
	}

	private unprotectedAppendNode(item: T): LinkedListNode_<T> {
		const newNode: LinkedListNode_<T> = { value: item, next: null };
		if (this.tail) {
			this.tail.next = newNode;
		} else {
			this.head = newNode;
		}
		this.tail = newNode;
		this.size++;
		return newNode;
	}

	/**
	 * Links `items` between `previous` (or the head, if `null`) and `after` (or
	 * nothing — the new tail — if `null`). Shared by `internalSplice`'s insertion
	 * phase and `insertAfter`, which reach `previous` by index and by cursor
	 * respectively but otherwise splice in the exact same way.
	 */
	private linkItemsAfter(
		previous: LinkedListNode_<T> | null,
		after: LinkedListNode_<T> | null,
		items: readonly T[],
	): void {
		for (let index = 0; index < items.length; index++) {
			const newNode: LinkedListNode_<T> = { value: items[index]!, next: null };
			if (previous) {
				previous.next = newNode;
			} else {
				this.head = newNode;
			}
			previous = newNode;
			this.size++;
		}

		if (previous) {
			previous.next = after;
		} else {
			this.head = after;
		}

		if (!after) {
			this.tail = previous;
		}
	}

	/**
	 * The single-item counterpart of {@link linkItemsAfter}, allocating one node
	 * and nothing else.
	 */
	private linkItemAfter(
		previous: LinkedListNode_<T> | null,
		after: LinkedListNode_<T> | null,
		item: T,
	): void {
		const newNode: LinkedListNode_<T> = { value: item, next: after };

		if (previous) {
			previous.next = newNode;
		} else {
			this.head = newNode;
		}

		if (!after) {
			this.tail = newNode;
		}

		this.size++;
	}

	begin(): LinkedListCursor<T> {
		return new LinkedListCursor(this, this.head);
	}

	end(): LinkedListCursor<T> {
		return new LinkedListCursor(this, null);
	}

	cursorAt(index: number): LinkedListCursor<T> {
		index = index < 0 ? this.size + index : index;
		return new LinkedListCursor(this, this.getNodeAt(index).current);
	}

	insertAfter(cursor: LinkedListCursor<T>, item: T): void {
		const node = this.validatedNode(cursor);

		if (node === null) {
			this.linkItemAfter(this.tail, null, item);
		} else {
			this.linkItemAfter(node, node.next, item);
		}
	}

	insertAllAfter(cursor: LinkedListCursor<T>, items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		const node = this.validatedNode(cursor);

		if (node === null) {
			this.linkItemsAfter(this.tail, null, items);
		} else {
			this.linkItemsAfter(node, node.next, items);
		}
	}

	removeAfter(cursor: LinkedListCursor<T>): T | undefined {
		const anchor = this.validatedNode(cursor);
		// `null` means past-the-end (from `end()`/advancing off the tail) —
		// there is nothing after it, unlike `insertAfter`'s append fallback.
		const target = anchor ? anchor.next : null;

		if (!target) {
			return undefined;
		}

		this.unlinkNode(anchor, target);
		return target.value;
	}

	setAt(cursor: LinkedListCursor<T>, item: T): void {
		const node = this.validatedNode(cursor);

		if (node === null) {
			throw new RangeError("Cannot setAt a past-the-end cursor");
		}

		node.value = item;
	}

	private validatedNode(
		cursor: LinkedListCursor<T>,
	): LinkedListNode_<T> | null {
		const node = cursor._node();

		if (node !== null && node.removed) {
			throw new RangeError("Cursor's element has been removed from the list");
		}

		return node;
	}
}
