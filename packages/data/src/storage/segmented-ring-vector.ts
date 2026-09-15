import { DefinedValue } from "@ac-kit/core";

import { IListStorage } from "../list/ilist-storage.js";

export type SegmentedRingVectorOptions = {
	/**
	 * Pre-allocate exactly this many slots and never grow.
	 *
	 * This is what makes a fixed-size collection: hand the vector to any
	 * `Bounded*`/`Blocking*` collection without repeating the number, and it
	 * takes its capacity from here. Omit it and the vector grows geometrically
	 * instead, in which case it must not be used as a bounded collection's
	 * storage — there is nothing for that collection to bound itself by.
	 */
	capacity?: number;

	/**
	 * The number of elements each chunk should hold. This determines the
	 * granularity of the segmented storage.
	 */
	chunkSize?: number;
};

export class SegmentedRingVector<
	T extends DefinedValue,
> implements IListStorage<T> {
	private chunks: (T | undefined)[][] = [];
	private head = 0;
	private tail = 0;
	readonly chunkSize: number;
	readonly capacity: number;

	constructor(iterable?: Iterable<T>, options?: SegmentedRingVectorOptions) {
		const capacity = options?.capacity ?? Infinity;

		if (capacity < 0 || Number.isNaN(capacity)) {
			throw new RangeError(
				`Capacity must be a non-negative number, got ${capacity}`,
			);
		}

		this.capacity = capacity;

		const chunkSize = options?.chunkSize ?? 64;

		if (chunkSize <= 0 || Number.isNaN(chunkSize)) {
			throw new RangeError(
				`Chunk size must be a positive number, got ${chunkSize}`,
			);
		}

		this.chunkSize = chunkSize;

		const items = iterable ? Array.from(iterable) : [];

		if (items.length > capacity) {
			throw new RangeError(
				`Initial iterable holds ${items.length} items, exceeding the capacity of ${capacity}`,
			);
		}

		// Pre-allocate chunks based on initial items and chunk size
		const requiredChunks = Math.ceil(items.length / this.chunkSize);
		for (let i = 0; i < requiredChunks; i++) {
			this.chunks[i] = new Array(this.chunkSize);
		}

		// Populate initial items
		for (let i = 0; i < items.length; i++) {
			const [chunkIndex, itemIndex] = this.index_(i);
			this.chunks[chunkIndex]![itemIndex] = items[i];
		}

		this.tail = items.length;
	}

	*[Symbol.iterator](): Iterator<T> {
		for (let i = this.head; i < this.tail; i++) {
			const [chunkIndex, itemIndex] = this.index_(i);
			yield this.chunks[chunkIndex]![itemIndex]!;
		}
	}

	count(): number {
		return this.tail - this.head;
	}

	clear(): void {
		this.chunks = [];
		this.head = 0;
		this.tail = 0;
	}

	get(index: number): T | undefined {
		const [chunkIndex, itemIndex] = this.index_(index);

		return this.chunks[chunkIndex]?.[itemIndex];
	}

	set(index: number, item: T): void {
		const [chunkIndex, itemIndex] = this.index_(index);

		if (!this.chunks[chunkIndex]) {
			this.chunks[chunkIndex] = new Array(this.chunkSize);
		}

		this.chunks[chunkIndex][itemIndex] = item;
	}

	pushBack(item: T): void {
		const [chunkIndex, itemIndex] = this.index_(this.tail);

		if (!this.chunks[chunkIndex]) {
			this.chunks[chunkIndex] = new Array(this.chunkSize);
		}

		this.chunks[chunkIndex][itemIndex] = item;
		this.tail++;
	}

	pushBackAll(items: Iterable<T>): void {
		for (const item of items) {
			this.pushBack(item);
		}
	}

	popBack(): T | undefined {
		if (this.head === this.tail) {
			return;
		}

		const [chunkIndex, itemIndex] = this.index_(this.tail - 1);

		const value = this.chunks[chunkIndex]![itemIndex];

		this.chunks[chunkIndex]![itemIndex] = undefined;

		this.tail--;

		if (itemIndex === 0) {
			delete this.chunks[chunkIndex];
		}

		if (this.head === this.tail) {
			this.head = 0;
			this.tail = 0;
			this.chunks = [];
		}

		return value;
	}

	back(): T | undefined {
		if (this.head === this.tail) {
			return;
		}

		const [chunkIndex, itemIndex] = this.index_(this.tail - 1);

		return this.chunks[chunkIndex]![itemIndex];
	}

	pushFront(item: T): void {
		const [chunkIndex, itemIndex] = this.index_(this.head - 1);

		if (!this.chunks[chunkIndex]) {
			this.chunks[chunkIndex] = new Array(this.chunkSize);
		}

		this.chunks[chunkIndex][itemIndex] = item;
		this.head--;
	}

	pushFrontAll(items: readonly T[]): void {
		for (const item of items) {
			this.pushFront(item);
		}
	}

	popFront(): T | undefined {
		if (this.head === this.tail) {
			return;
		}

		const [chunkIndex, itemIndex] = this.index_(this.head);

		const value = this.chunks[chunkIndex]![itemIndex];

		// Clean up reference for Garbage Collection
		//this.chunks[chunkIndex]![itemIndex] = undefined;

		this.head++;

		if (itemIndex === this.chunkSize - 1) {
			delete this.chunks[chunkIndex];
		}

		if (this.head === this.tail) {
			this.head = 0;
			this.tail = 0;
			this.chunks = [];
		}

		return value;
	}

	front(): T | undefined {
		if (this.head === this.tail) {
			return;
		}

		const [chunkIndex, itemIndex] = this.index_(this.head);

		return this.chunks[chunkIndex]![itemIndex];
	}

	private index_(index: number): [chunkIndex: number, itemIndex: number] {
		const chunkIndex = Math.floor(index / this.chunkSize);
		const itemIndex = index % this.chunkSize;
		return [chunkIndex, itemIndex];
	}
}
