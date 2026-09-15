import type { Callable } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import {
	CollectionCapacityExceededError,
	IBounded,
} from "../collection/ibounded.js";
import type { ICursor } from "../cursor/icursor.js";
import { BoundedArrayList } from "../list/bounded-array-list.js";
import { BoundedCircularArrayList } from "../list/bounded-circular-array-list.js";
import { BoundedDoublyLinkedList } from "../list/bounded-doubly-linked-list.js";
import { BoundedLinkedList } from "../list/bounded-linked-list.js";
import { IList } from "../list/ilist.js";

type BoundedCursorList = IList<number> &
	IBounded & {
		begin(): ICursor<number>;
		insertAfter(cursor: never, item: number): void;
	};

/**
 * `IBoundedList` compliance for the four `Bounded*List` wrappers: every path
 * that can add an element has to be guarded, not just `set`/`splice`.
 */
suite.each<{
	description: string;
	factory: Callable<[capacity: number], BoundedCursorList>;
}>([
	{
		description: "BoundedArrayList",
		factory: (capacity) =>
			new BoundedArrayList(undefined, { capacity }) as BoundedCursorList,
	},
	{
		description: "BoundedCircularArrayList",
		factory: (capacity) =>
			new BoundedCircularArrayList(undefined, {
				capacity,
			}) as BoundedCursorList,
	},
	{
		description: "BoundedLinkedList",
		factory: (capacity) =>
			new BoundedLinkedList(undefined, { capacity }) as BoundedCursorList,
	},
	{
		description: "BoundedDoublyLinkedList",
		factory: (capacity) =>
			new BoundedDoublyLinkedList(undefined, {
				capacity,
			}) as BoundedCursorList,
	},
])("$description IBoundedList compliance", ({ factory }) => {
	test("should throw when an appending set would exceed the capacity", () => {
		const list = factory(2);

		list.set(0, 1);
		list.set(1, 2);

		expect(() => list.set(2, 3)).toThrow(CollectionCapacityExceededError);
		expect(list.count()).toBe(2);
	});

	test("should allow an overwriting set at capacity", () => {
		const list = factory(2);

		list.set(0, 1);
		list.set(1, 2);
		list.set(1, 20);

		expect(Array.from(list)).toEqual([1, 20]);
	});

	test("should throw when a splice would grow past the capacity", () => {
		const list = factory(3);

		list.spliceAll(0, 0, [1, 2]);

		expect(() => list.spliceAll(0, 0, [3, 4])).toThrow(
			CollectionCapacityExceededError,
		);
		expect(Array.from(list)).toEqual([1, 2]);
	});

	test("should allow a splice that replaces rather than grows", () => {
		const list = factory(2);

		list.spliceAll(0, 0, [1, 2]);
		list.spliceAll(0, 2, [3, 4]);

		expect(Array.from(list)).toEqual([3, 4]);
	});

	test("should free room again after a removal", () => {
		const list = factory(2);

		list.spliceAll(0, 0, [1, 2]);
		list.removeFirst((value) => value === 1);
		list.splice(1, 0, 3);

		expect(Array.from(list)).toEqual([2, 3]);
	});

	test("should throw when a cursor insertion would exceed the capacity", () => {
		const list = factory(2);

		list.spliceAll(0, 0, [1, 2]);

		expect(() => list.insertAfter(list.begin() as never, 3)).toThrow(
			CollectionCapacityExceededError,
		);
	});
});
