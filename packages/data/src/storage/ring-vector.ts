import { nextPowerOfTwo, type DefinedValue } from "@ac-kit/core";

import { CollectionCapacityExceededError } from "../collection/ibounded.js";
import { IListStorage } from "../list/ilist-storage.js";

export type RingVectorOptions = {
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
};

/**
 * A wrap-around ("ring") vector: the storage tier of `CircularArrayList`,
 * without the list surface.
 *
 * This is the fastest general-purpose backing in the package and the default
 * under `Queue`, `Deque` and `Stack`. It carries no cursors, no predicate
 * search and no `splice`, so its end operations are pure index arithmetic over
 * one flat array. Reach for `CircularArrayList` instead when the extra `IList`
 * surface is actually needed.
 *
 * Time complexity: - Access/update by index: O(1) - Insert/remove at either
 * end: O(1) amortised (O(1) worst case when constructed with a `capacity`)
 * Space complexity: O(n)
 *
 * @template T The type of elements. Anything except `undefined`, which marks an
 *   empty slot.
 */
export class RingVector<T extends DefinedValue> implements IListStorage<T> {
	private static readonly MIN_PHYSICAL_LENGTH = 8;

	private data: (T | undefined)[];
	private dataLength = 0;
	private head = 0;
	private size = 0;

	/** `Infinity` when the vector grows on demand. */
	readonly capacity: number;

	constructor(iterable?: Iterable<T>, options?: RingVectorOptions) {
		const capacity = options?.capacity ?? Infinity;

		if (capacity < 0 || Number.isNaN(capacity)) {
			throw new RangeError(
				`Capacity must be a non-negative number, got ${capacity}`,
			);
		}

		this.capacity = capacity;

		const items = iterable
			? Array.isArray(iterable)
				? (iterable as T[])
				: Array.from(iterable)
			: [];
		const itemCount = items.length;

		if (itemCount > capacity) {
			throw new RangeError(
				`Initial iterable holds ${itemCount} items, exceeding the capacity of ${capacity}`,
			);
		}

		const itemsLengthNextPowerOfTwo = nextPowerOfTwo(itemCount);
		if (itemsLengthNextPowerOfTwo === null) {
			throw new RangeError(`Initial iterable length ${itemCount} is too large`);
		}

		this.data = new Array(
			capacity === Infinity
				? Math.max(itemsLengthNextPowerOfTwo, RingVector.MIN_PHYSICAL_LENGTH)
				: capacity,
		);
		this.dataLength = this.data.length;

		for (let i = 0; i < itemCount; i++) {
			this.data[i] = items[i];
		}
		this.size = itemCount;
	}

	*[Symbol.iterator](): Iterator<T> {
		for (let i = 0; i < this.size; i++) {
			yield this.data[this.physicalIndex_(this.dataLength, i)]!;
		}
	}

	count(): number {
		return this.size;
	}

	clear(): void {
		if (this.capacity === Infinity) {
			this.data = new Array<T | undefined>(RingVector.MIN_PHYSICAL_LENGTH);
			this.dataLength = this.data.length;
		} else {
			this.data.fill(undefined);
		}

		this.head = 0;
		this.size = 0;
	}

	get(index: number): T | undefined {
		if (index < 0 || index >= this.size) {
			return;
		}

		return this.data[this.physicalIndex_(this.dataLength, index)];
	}

	set(index: number, item: T): void {
		if (index < 0 || index >= this.size) {
			throw new RangeError(`Index ${index} is out of bounds [0, ${this.size})`);
		}

		this.data[this.physicalIndex_(this.dataLength, index)] = item;
	}

	pushBack(item: T): void {
		this.ensureRoomFor_(1);

		this.data[this.physicalIndex_(this.dataLength, this.size)] = item;
		this.size++;
	}

	pushBackAll(items: Iterable<T>): void {
		const itemsArray = Array.isArray(items)
			? (items as T[])
			: Array.from(items);

		if (itemsArray.length === 0) {
			return;
		}

		this.ensureRoomFor_(itemsArray.length);

		for (let i = 0; i < itemsArray.length; i++) {
			this.data[this.physicalIndex_(this.dataLength, this.size + i)] =
				itemsArray[i]!;
		}
		this.size += itemsArray.length;
	}

	popBack(): T | undefined {
		if (this.size === 0) {
			return;
		}

		const physical = this.physicalIndex_(this.dataLength, this.size - 1);
		const item = this.data[physical]!;

		// Drop the reference: a ring reuses slots, so a stale one would pin the
		// value for as long as the vector lives.
		if (typeof item === "object" || typeof item === "function") {
			this.data[physical] = undefined;
		}
		this.size--;

		return item;
	}

	back(): T | undefined {
		if (this.size === 0) {
			return;
		}

		return this.data[this.physicalIndex_(this.dataLength, this.size - 1)];
	}

	pushFront(item: T): void {
		this.ensureRoomFor_(1);

		this.head = this.head === 0 ? this.dataLength - 1 : this.head - 1;
		this.data[this.head] = item;
		this.size++;
	}

	pushFrontAll(items: readonly T[]): void {
		if (items.length === 0) {
			return;
		}

		this.ensureRoomFor_(items.length);

		// Backwards, so that `items[0]` ends up at the front — `Array.unshift`
		// order.
		for (let i = items.length - 1; i >= 0; i--) {
			this.head = this.head === 0 ? this.dataLength - 1 : this.head - 1;
			this.data[this.head] = items[i]!;
		}
		this.size += items.length;
	}

	popFront(): T | undefined {
		if (this.size === 0) {
			return;
		}

		const item = this.data[this.head]!;

		if (typeof item === "object" || typeof item === "function") {
			this.data[this.head] = undefined;
		}
		this.head = this.head + 1 === this.dataLength ? 0 : this.head + 1;
		this.size--;

		return item;
	}

	front(): T | undefined {
		if (this.size === 0) {
			return;
		}

		return this.data[this.head];
	}

	private physicalIndex_(dataLength: number, logicalIndex: number): number {
		const physical = this.head + logicalIndex;

		return physical >= dataLength ? physical - dataLength : physical;
	}

	/** Grows and re-linearizes (head becomes `0`) if `size + extra` overflows. */
	private ensureRoomFor_(extra: number): void {
		const required = this.size + extra;

		if (required <= this.dataLength) {
			return;
		}

		this.grow_(required);
	}

	private grow_(required: number): void {
		if (required > this.capacity) {
			throw new CollectionCapacityExceededError(this.capacity);
		}

		const requiredNextPowerOfTwo = nextPowerOfTwo(required);
		if (requiredNextPowerOfTwo === null) {
			throw new RangeError(`Required size ${required} is too large`);
		}

		const relinearized = new Array<T | undefined>(
			Math.max(
				this.dataLength * 2,
				RingVector.MIN_PHYSICAL_LENGTH,
				requiredNextPowerOfTwo,
			),
		);

		for (let i = 0; i < this.size; i++) {
			relinearized[i] = this.data[this.physicalIndex_(this.dataLength, i)];
		}

		this.data = relinearized;
		this.dataLength = this.data.length;
		this.head = 0;
	}
}
