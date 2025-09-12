import type { Callable, Predicate } from "../ecma/function/types.js";
import type { IHeap } from "./abstract-types/iheap.js";
import { NativeListCollection } from "./collection-base/native-array-collection.js";

/**
 * A binary heap implementation.
 *
 * @template T The type of elements in the heap.
 */
export class BinaryHeap<T> extends NativeListCollection<T> implements IHeap<T> {
	constructor(
		readonly isItemOrdered: Predicate<[T, T]>,
		iterable?: Iterable<T>,
		capacity?: number,
	) {
		super(iterable, capacity);

		// Heapify the initial items array
		this.heapifyAll();
	}

	override remove(condition: Predicate<[T]>): IterableIterator<T> {
		const removedItems = super.remove(condition);
		this.heapifyAll();
		return removedItems;
	}

	override removeFirst(condition: Predicate<[T]>): boolean {
		const removed = super.removeFirst(condition);
		this.heapifyAll();
		return removed;
	}

	override replace(
		condition: Predicate<[T]>,
		newItem: Callable<[T], T>,
	): IterableIterator<T> {
		const replacedItems = super.replace(condition, newItem);
		this.heapifyAll();
		return replacedItems;
	}

	override replaceFirst(condition: Predicate<[T]>, newItem: T): boolean {
		const replaced = super.replaceFirst(condition, newItem);
		this.heapifyAll();
		return replaced;
	}

	insert(...items: T[]): void {
		const count = this.data.count();
		this.data.splice(count, 0, ...items);
		this.heapifyUp(count);
	}

	async waitInsert(
		items: Iterable<T>,
		signal?: AbortSignal | null,
	): Promise<void> {
		const count = this.data.count();
		await this.data.waitSplice(count, 0, items, signal);
		this.heapifyUp(count);
	}

	extract(): T | undefined {
		const count = this.data.count();
		// fast path: if the heap is empty, just return undefined
		if (count === 0) {
			return;
		}

		// fast path: if the heap has only one item, just pop it
		if (count === 1) {
			return this.data.splice(0, 1).next().value;
		}

		const root = this.root();
		const removed = this.data.splice(-1, 1).next().value;
		this.data.set(0, removed);
		this.heapifyDown(0);
		return root;
	}

	insertAndExtract(item: T): T | undefined {
		const root = this.root();

		// fast path: if the heap is empty, just return the item
		if (root === undefined) {
			return item;
		}

		// fast path: if the new item is going to be the root, just return the item
		if (this.isItemOrdered(item, root)) {
			return item;
		}

		this.data.set(0, item);
		this.heapifyDown(0);
		return root;
	}

	extractAndInsert(item: T): T | undefined {
		// fast path: if the heap is empty, just insert the item
		if (this.data.count() === 0) {
			this.data.set(0, item);
			return;
		}

		const root = this.root();
		this.data.set(0, item);
		this.heapifyDown(0);
		return root;
	}

	root(): T | undefined {
		return this.data.get(0);
	}

	/**
	 * Gets the parent index of a given index in the heap.
	 *
	 * @param index The index to get the parent index for.
	 * @returns The parent index of the given index. Returns -1 if the index is 0 (root).
	 */
	private getParentIndex(index: number): number {
		return Math.floor((index - 1) / 2);
	}

	/**
	 * Gets the left child index of a given index in the heap.
	 *
	 * @param index The index to get the left child index for.
	 * @returns The left child index of the given index.
	 */
	private getLeftChildIndex(index: number): number {
		return 2 * index + 1;
	}

	/**
	 * Gets the right child index of a given index in the heap.
	 *
	 * @param index The index to get the right child index for.
	 * @returns The right child index of the given index.
	 */
	private getRightChildIndex(index: number): number {
		return 2 * index + 2;
	}

	/**
	 * Heapifies the entire data array to maintain the heap property.
	 */
	private heapifyAll() {
		for (let i = Math.floor(this.data.count() / 2) - 1; i >= 0; i--) {
			this.heapifyDown(i);
		}
	}

	/**
	 * Heapifies up from the given index to maintain the heap property.
	 *
	 * @param index The index to heapify up from.
	 */
	private heapifyUp(index: number): void {
		let currentIndex = index;
		while (currentIndex > 0) {
			const parentIndex = this.getParentIndex(currentIndex);
			const current = this.data.get(currentIndex);
			const parent = this.data.get(parentIndex);

			if (
				parent !== undefined &&
				current !== undefined &&
				!this.isItemOrdered(parent, current)
			) {
				this.data.set(currentIndex, parent);
				this.data.set(parentIndex, current);
				currentIndex = parentIndex;
			} else {
				break;
			}
		}
	}

	/**
	 * Heapifies down from the given index to maintain the heap property.
	 *
	 * @param index The index to heapify down from.
	 */
	private heapifyDown(index: number): void {
		const count = this.data.count();

		let currentIndex = index;
		let current = this.data.get(currentIndex);

		let leftChildIndex = this.getLeftChildIndex(currentIndex);
		while (current !== undefined && leftChildIndex < count) {
			// Determine candidate for swap
			let candidateIndex = currentIndex;
			let candidate = current;

			// Compare with left child
			const leftChild = this.data.get(leftChildIndex);
			if (
				leftChild !== undefined &&
				!this.isItemOrdered(candidate, leftChild)
			) {
				candidateIndex = leftChildIndex;
				candidate = leftChild;
			}

			// Compare with right child
			const rightChildIndex = this.getRightChildIndex(currentIndex);
			const rightChild =
				rightChildIndex < count ? this.data.get(rightChildIndex) : undefined;
			if (
				rightChild !== undefined &&
				!this.isItemOrdered(candidate, rightChild)
			) {
				candidateIndex = rightChildIndex;
				candidate = rightChild;
			}

			// If the candidate is still the current index, the heap property is satisfied
			if (candidateIndex === currentIndex) {
				break;
			}

			// Swap current with candidate
			this.data.set(currentIndex, candidate);
			this.data.set(candidateIndex, current);

			currentIndex = candidateIndex;
			current = this.data.get(currentIndex);

			leftChildIndex = this.getLeftChildIndex(currentIndex);
		}
	}
}
