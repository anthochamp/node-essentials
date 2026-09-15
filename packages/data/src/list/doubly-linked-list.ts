import {
	clamp,
	type Callable,
	type DefinedValue,
	type Predicate,
} from "@ac-kit/core";

import { IBidirectionalCursorSequence } from "../cursor/ibidirectional-cursor-sequence.js";
import { IBidirectionalCursor } from "../cursor/ibidirectional-cursor.js";
import { IPopBackStorage } from "../storage/ipop-back-storage.js";
import { IPopFrontStorage } from "../storage/ipop-front-storage.js";
import { IPushBackStorage } from "../storage/ipush-back-storage.js";
import { IPushFrontStorage } from "../storage/ipush-front-storage.js";
import { IList, ListIndexOutOfBoundsError } from "./ilist.js";

type DoublyLinkedListNode_<T> = {
	value: T;
	next: DoublyLinkedListNode_<T> | null;
	prev: DoublyLinkedListNode_<T> | null;
	/** Set once this node is unlinked — what a cursor's `valid` checks. */
	removed?: boolean;
};

/**
 * A cursor over a {@link DoublyLinkedList}.
 *
 * A cursor whose element was removed — by any means, not just through this
 * cursor — is exactly when `valid` becomes `false`; the underlying node is
 * marked on removal, and every cursor still referencing it observes that mark.
 * `end()`'s cursor has no node of its own: `insertAfter`/`insertBefore` on it
 * append (reading the list's current tail live, so it never goes stale), and
 * `retreat()` from it moves to the current last element. Retreating past the
 * first element fails (returns `false`, cursor unchanged) rather than modelling
 * a symmetrical "before the beginning" position.
 *
 * @template T The type of elements in the list.
 */
export class DoublyLinkedListCursor<
	T extends DefinedValue,
> implements IBidirectionalCursor<T> {
	constructor(
		private readonly list: DoublyLinkedList<T>,
		private node: DoublyLinkedListNode_<T> | null,
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

	retreat(): boolean {
		if (this.node === null) {
			const tail = this.list._tailNode();
			if (tail === null) {
				return false;
			}

			this.node = tail;
			return true;
		}

		if (!this.valid) {
			return false;
		}

		const previous = this.node.prev;
		if (previous === null) {
			return false;
		}

		this.node = previous;
		return true;
	}

	clone(): DoublyLinkedListCursor<T> {
		return new DoublyLinkedListCursor(this.list, this.node);
	}

	/** @internal Used by `DoublyLinkedList`'s cursor-sequence methods only. */
	_node(): DoublyLinkedListNode_<T> | null {
		return this.node;
	}
}

/**
 * A doubly linked list implementation.
 *
 * Time complexity: - Access (by index): O(n) - Update (by index): O(n) -
 * Insert: O(1) at head and tail, O(n) otherwise - Remove: O(1) at head and
 * tail, O(n) otherwise - Search: O(n) Space complexity: O(n)
 *
 * `IIndexed` is deliberately not declared — indexing is O(n) on this backing.
 * See `CircularArrayList` for O(1) throughout.
 *
 * Unbounded. For a capacity, wrap it in `BoundedDoublyLinkedList` or
 * `BlockingDoublyLinkedList`.
 *
 * @template T The type of elements in the list.
 */
export class DoublyLinkedList<T extends DefinedValue>
	implements
		IList<T>,
		IPushBackStorage<T>,
		IPopBackStorage<T>,
		IPushFrontStorage<T>,
		IPopFrontStorage<T>,
		IBidirectionalCursorSequence<T, DoublyLinkedListCursor<T>>
{
	private head: DoublyLinkedListNode_<T> | null = null;
	private tail: DoublyLinkedListNode_<T> | null = null;
	private size = 0;

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
		while (current) {
			if (condition(current.value)) {
				this.unlinkNode(current);
				return true;
			}
			current = current.next;
		}
		return false;
	}

	remove(condition: Predicate<[T]>): IterableIterator<T> {
		const removedItems: T[] = [];
		let current = this.head;
		while (current) {
			if (condition(current.value)) {
				removedItems.push(current.value);
				this.unlinkNode(current);
			}
			current = current.next;
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

	popBack(): T | undefined {
		const node = this.tail;

		if (!node) {
			return undefined;
		}

		node.removed = true;
		this.tail = node.prev;
		if (node.prev) {
			node.prev.next = null;
		} else {
			this.head = null;
		}
		this.size--;

		return node.value;
	}

	back(): T | undefined {
		return this.tail?.value;
	}

	pushFront(item: T): void {
		this.unprotectedPrependNode(item);
	}

	pushFrontAll(items: readonly T[]): void {
		// Backwards, so that `items[0]` ends up at the front — `Array.unshift`
		// order, which is what `splice(0, 0, ...items)` used to give.
		for (let i = items.length - 1; i >= 0; i--) {
			this.unprotectedPrependNode(items[i]!);
		}
	}

	popFront(): T | undefined {
		const node = this.head;

		if (!node) {
			return undefined;
		}

		node.removed = true;
		this.head = node.next;
		if (node.next) {
			node.next.prev = null;
		} else {
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
		const removedItems: T[] = [];
		// Through `getNodeAt`, which knows about the tail: walking from the head
		// made appending at the end cost a full traversal of the list.
		const { previous, current } = this.getNodeAt(computedStart);

		let next = current;

		// Remove items
		for (let j = 0; j < computedDeleteCount && next; j++) {
			removedItems.push(next.value);
			next.removed = true;

			const nextNode = next.next;

			if (next.prev) {
				next.prev.next = next.next;
			} else {
				this.head = next.next;
			}
			if (next.next) {
				next.next.prev = next.prev;
			} else {
				this.tail = next.prev;
			}

			next = nextNode;
			this.size--;
		}

		this.linkBetween(previous, next, items);

		return removedItems[Symbol.iterator]();
	}

	private unlinkNode(current: DoublyLinkedListNode_<T>): void {
		current.removed = true;

		if (current.prev) {
			current.prev.next = current.next;
		} else {
			this.head = current.next;
		}
		if (current.next) {
			current.next.prev = current.prev;
		} else {
			this.tail = current.prev;
		}
		this.size--;
	}

	/**
	 * Links `items` between `prev` (or the head, if `null`) and `next` (or
	 * nothing — the new tail — if `null`). Shared by `internalSplice`'s insertion
	 * phase and the cursor-based `insertAfter`/`insertBefore`, which reach their
	 * anchors by index and by cursor respectively but otherwise splice in the
	 * exact same way.
	 */
	private linkBetween(
		prev: DoublyLinkedListNode_<T> | null,
		next: DoublyLinkedListNode_<T> | null,
		items: readonly T[],
	): void {
		for (let index = 0; index < items.length; index++) {
			prev = this.linkOneBetween(prev, next, items[index]!);
		}
	}

	/** The single-link step of {@link linkBetween}; returns the node just linked. */
	private linkOneBetween(
		prev: DoublyLinkedListNode_<T> | null,
		next: DoublyLinkedListNode_<T> | null,
		item: T,
	): DoublyLinkedListNode_<T> {
		const newNode: DoublyLinkedListNode_<T> = { value: item, next, prev };

		if (prev) {
			prev.next = newNode;
		} else {
			this.head = newNode;
		}
		if (next) {
			next.prev = newNode;
		} else {
			this.tail = newNode;
		}

		this.size++;

		return newNode;
	}

	private getNodeAt(index: number): {
		previous: DoublyLinkedListNode_<T> | null;
		current: DoublyLinkedListNode_<T> | null;
	} {
		if (index < 0 || index > this.size) {
			return { current: null, previous: null };
		}

		if (index === this.size) {
			return { current: null, previous: this.tail };
		}

		// From whichever end is closer; the backward links exist for this.
		if (index <= this.size >> 1) {
			let current = this.head;
			for (let position = 0; current && position < index; position++) {
				current = current.next;
			}
			return { current, previous: current?.prev ?? null };
		}

		let current = this.tail;
		for (
			let position = this.size - 1;
			current && position > index;
			position--
		) {
			current = current.prev;
		}
		return { current, previous: current?.prev ?? null };
	}

	private unprotectedAppendNode(item: T): void {
		const newNode: DoublyLinkedListNode_<T> = {
			value: item,
			next: null,
			prev: this.tail,
		};
		if (this.tail) {
			this.tail.next = newNode;
		} else {
			this.head = newNode;
		}
		this.tail = newNode;
		this.size++;
	}

	private unprotectedPrependNode(item: T): void {
		const newNode: DoublyLinkedListNode_<T> = {
			value: item,
			next: this.head,
			prev: null,
		};
		if (this.head) {
			this.head.prev = newNode;
		} else {
			this.tail = newNode;
		}
		this.head = newNode;
		this.size++;
	}

	begin(): DoublyLinkedListCursor<T> {
		return new DoublyLinkedListCursor(this, this.head);
	}

	end(): DoublyLinkedListCursor<T> {
		return new DoublyLinkedListCursor(this, null);
	}

	cursorAt(index: number): DoublyLinkedListCursor<T> {
		index = index < 0 ? this.size + index : index;
		return new DoublyLinkedListCursor(this, this.getNodeAt(index).current);
	}

	insertAfter(cursor: DoublyLinkedListCursor<T>, item: T): void {
		const node = this.validatedNode(cursor);

		this.linkOneBetween(node ?? this.tail, node ? node.next : null, item);
	}

	insertAllAfter(cursor: DoublyLinkedListCursor<T>, items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		const node = this.validatedNode(cursor);

		this.linkBetween(node ?? this.tail, node ? node.next : null, items);
	}

	insertBefore(cursor: DoublyLinkedListCursor<T>, item: T): void {
		const node = this.validatedNode(cursor);

		this.linkOneBetween(node ? node.prev : this.tail, node, item);
	}

	insertAllBefore(
		cursor: DoublyLinkedListCursor<T>,
		items: readonly T[],
	): void {
		if (items.length === 0) {
			return;
		}

		const node = this.validatedNode(cursor);

		this.linkBetween(node ? node.prev : this.tail, node, items);
	}

	removeAfter(cursor: DoublyLinkedListCursor<T>): T | undefined {
		const anchor = this.validatedNode(cursor);
		// `null` means past-the-end — there is nothing after it, unlike
		// `insertAfter`'s append fallback.
		const target = anchor ? anchor.next : null;

		if (!target) {
			return undefined;
		}

		this.unlinkNode(target);
		return target.value;
	}

	removeAt(cursor: DoublyLinkedListCursor<T>): T | undefined {
		const node = this.validatedNode(cursor);

		if (node === null) {
			return undefined;
		}

		this.unlinkNode(node);
		return node.value;
	}

	setAt(cursor: DoublyLinkedListCursor<T>, item: T): void {
		const node = this.validatedNode(cursor);

		if (node === null) {
			throw new RangeError("Cannot setAt a past-the-end cursor");
		}

		node.value = item;
	}

	/** @internal Used by `DoublyLinkedListCursor.retreat` only. */
	_tailNode(): DoublyLinkedListNode_<T> | null {
		return this.tail;
	}

	private validatedNode(
		cursor: DoublyLinkedListCursor<T>,
	): DoublyLinkedListNode_<T> | null {
		const node = cursor._node();

		if (node !== null && node.removed) {
			throw new RangeError("Cursor's element has been removed from the list");
		}

		return node;
	}
}
