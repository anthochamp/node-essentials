import type { Callable, Predicate } from "../../ecma/function/types.js";
import type { ICollection } from "../abstract-types/icollection.js";
import { BinaryHeap } from "../binary-heap.js";

export class BinaryHeapCollection<T> implements ICollection<T> {
	protected readonly data: BinaryHeap<T>;

	constructor(
		isItemOrdered: Predicate<[T, T]>,
		iterable?: Iterable<T>,
		readonly capacity: number = Infinity,
	) {
		this.data = new BinaryHeap(isItemOrdered, iterable, capacity);
	}

	[Symbol.iterator](): Iterator<T> {
		return this.data[Symbol.iterator]();
	}
	[Symbol.asyncIterator](): AsyncIterator<T> {
		return this.data[Symbol.asyncIterator]();
	}

	clear(): void {
		this.data.clear();
	}

	count(): number {
		return this.data.count();
	}

	concat(...items: T[]): IterableIterator<T> {
		return this.data.concat(...items);
	}

	removeFirst(condition: Predicate<[T]>): boolean {
		return this.data.removeFirst(condition);
	}

	remove(condition: Predicate<[T]>): IterableIterator<T> {
		return this.data.remove(condition);
	}

	replaceFirst(condition: Predicate<[T]>, newItem: T): boolean {
		return this.data.replaceFirst(condition, newItem);
	}

	replace(
		condition: Predicate<[T]>,
		newItem: Callable<[T], T>,
	): IterableIterator<T> {
		return this.data.replace(condition, newItem);
	}
}
