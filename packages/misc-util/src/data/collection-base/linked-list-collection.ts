import type { Callable, Predicate } from "../../ecma/function/types.js";
import type { ICollection } from "../abstract-types/icollection.js";
import { LinkedList } from "../linked-list.js";

export class LinkedListCollection<T> implements ICollection<T> {
	protected readonly data: LinkedList<T>;

	constructor(
		iterable?: Iterable<T>,
		readonly capacity: number = Infinity,
	) {
		this.data = new LinkedList(iterable, capacity);
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
