import type { Callable } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { ArrayList } from "../list/array-list.js";
import { CircularArrayList } from "../list/circular-array-list.js";
import { DoublyLinkedList } from "../list/doubly-linked-list.js";
import { IList } from "../list/ilist.js";
import { LinkedList } from "../list/linked-list.js";

suite.each<{
	description: string;
	factory: Callable<[iterator?: Iterable<number>], IList<number>>;
}>([
	{
		description: "DoublyLinkedList",
		factory: (iterator) => new DoublyLinkedList(iterator),
	},
	{
		description: "LinkedList",
		factory: (iterator) => new LinkedList(iterator),
	},
	{
		description: "ArrayList",
		factory: (iterator) => new ArrayList(iterator),
	},
	{
		description: "CircularArrayList",
		factory: (iterator) => new CircularArrayList(iterator),
	},
])("$description IList compliance", ({ factory }) => {
	test("should get items by index", () => {
		const list: IList<number> = factory([1, 2, 3]);
		expect(list.get(0)).toBe(1);
		expect(list.get(1)).toBe(2);
		expect(list.get(2)).toBe(3);
		expect(list.get(-1)).toBe(3);
		expect(list.get(-2)).toBe(2);
		expect(list.get(-3)).toBe(1);
		expect(list.get(3)).toBeUndefined();
		expect(list.get(-4)).toBeUndefined();
	});

	test("should set items by index", () => {
		const list: IList<number> = factory([1, 2, 3]);
		list.set(0, 4);
		list.set(1, 5);
		list.set(2, 6);
		expect(Array.from(list)).toEqual([4, 5, 6]);
		list.set(-1, 3);
		list.set(-2, 2);
		list.set(-3, 1);
		expect(Array.from(list)).toEqual([1, 2, 3]);
		expect(() => list.set(-4, 0)).toThrow(RangeError);
	});

	test("should append an item to the list if index equals to the list size", () => {
		const list: IList<number> = factory([1, 2, 3]);
		list.set(3, 4);
		expect(Array.from(list)).toEqual([1, 2, 3, 4]);
		list.set(4, 5);
		expect(Array.from(list)).toEqual([1, 2, 3, 4, 5]);
	});

	test("should splice items", () => {
		const list: IList<number> = factory([1, 2, 3, 4, 5]);
		let removed: IterableIterator<number>;

		removed = list.spliceAll(1, 2, [6, 7]);
		expect(Array.from(removed)).toEqual([2, 3]);
		expect(Array.from(list)).toEqual([1, 6, 7, 4, 5]);
		expect(list.count()).toBe(5);

		removed = list.spliceAll(-2, 1, [8, 9]);
		expect(Array.from(removed)).toEqual([4]);
		expect(Array.from(list)).toEqual([1, 6, 7, 8, 9, 5]);
		expect(list.count()).toBe(6);

		removed = list.splice(4, 10);
		expect(Array.from(removed)).toEqual([9, 5]);
		expect(Array.from(list)).toEqual([1, 6, 7, 8]);
		expect(list.count()).toBe(4);

		removed = list.splice(0);
		expect(Array.from(removed)).toEqual([1, 6, 7, 8]);
		expect(Array.from(list)).toEqual([]);
		expect(list.count()).toBe(0);

		removed = list.spliceAll(0, 0, [1, 2, 3, 4, 5]);
		expect(Array.from(removed)).toEqual([]);
		expect(Array.from(list)).toEqual([1, 2, 3, 4, 5]);
		expect(list.count()).toBe(5);

		removed = list.spliceAll(list.count(), 0, [6, 7]);
		expect(Array.from(removed)).toEqual([]);
		expect(Array.from(list)).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(list.count()).toBe(7);

		list.splice(0);
		expect(() => list.splice(1)).toThrow(RangeError);
		expect(() => list.splice(-1)).toThrow(RangeError);
	});

	test("should insert one item with splice and a batch with spliceAll", () => {
		const list: IList<number> = factory([1, 4]);

		expect(Array.from(list.splice(1, 0, 2))).toEqual([]);
		expect(Array.from(list)).toEqual([1, 2, 4]);

		expect(Array.from(list.spliceAll(2, 0, [3]))).toEqual([]);
		expect(Array.from(list)).toEqual([1, 2, 3, 4]);
	});

	test("should delete without inserting when the item argument is omitted", () => {
		const list: IList<number> = factory([1, 2, 3]);

		expect(Array.from(list.splice(1, 1))).toEqual([2]);
		expect(Array.from(list)).toEqual([1, 3]);

		expect(Array.from(list.spliceAll(0, 1, []))).toEqual([1]);
		expect(Array.from(list)).toEqual([3]);
	});

	test("should slice items", () => {
		const list: IList<number> = factory([1, 2, 3, 4, 5]);

		expect(Array.from(list.slice(1, 4))).toEqual([2, 3, 4]);
		expect(Array.from(list.slice(-4, -1))).toEqual([2, 3, 4]);
		expect(Array.from(list.slice(2))).toEqual([3, 4, 5]);
		expect(Array.from(list.slice(-3))).toEqual([3, 4, 5]);
		expect(Array.from(list.slice())).toEqual([1, 2, 3, 4, 5]);
		expect(Array.from(list.slice(3, 50))).toEqual([4, 5]);
	});

	/**
	 * Long enough that an implementation which always walks from the head, or
	 * which never uses its backward links, is visibly wrong. Every test above
	 * uses three to five elements, where those mistakes are free.
	 */
	const LARGE = 128;
	const largeSource = () => Array.from({ length: LARGE }, (_, index) => index);

	test("should append at the end without losing order", () => {
		const list: IList<number> = factory();

		for (let index = 0; index < LARGE; index++) {
			list.splice(list.count(), 0, index);
		}

		expect(Array.from(list)).toEqual(largeSource());
	});

	test("should get every index of a large list", () => {
		const list: IList<number> = factory(largeSource());

		const read: (number | undefined)[] = [];
		for (let index = 0; index < LARGE; index++) {
			read.push(list.get(index));
		}

		expect(read).toEqual(largeSource());
	});

	test("should resolve negative indices in a large list", () => {
		const list: IList<number> = factory(largeSource());

		expect(list.get(-1)).toBe(LARGE - 1);
		expect(list.get(-LARGE)).toBe(0);
		expect(list.get(-(LARGE >> 1))).toBe(LARGE - (LARGE >> 1));
	});

	test("should splice like Array.prototype.splice at every position", () => {
		for (let start = 0; start <= LARGE; start++) {
			const list: IList<number> = factory(largeSource());
			const expected = largeSource();

			const expectedRemoved = expected.splice(start, 2, -1, -2);
			const removed = list.spliceAll(start, 2, [-1, -2]);

			expect(Array.from(removed)).toEqual(expectedRemoved);
			expect(Array.from(list)).toEqual(expected);
		}
	});

	test("should keep both ends reachable after removing them", () => {
		const list: IList<number> = factory([1, 2, 3]);

		list.splice(2, 1);
		list.splice(list.count(), 0, 4);
		list.splice(0, 1);
		list.splice(0, 0, 0);

		expect(Array.from(list)).toEqual([0, 2, 4]);
	});
});
