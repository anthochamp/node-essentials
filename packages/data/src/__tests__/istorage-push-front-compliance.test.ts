import type { Callable } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { CircularArrayList } from "../list/circular-array-list.js";
import { DoublyLinkedList } from "../list/doubly-linked-list.js";
import { LinkedList } from "../list/linked-list.js";
import { IPopFrontStorage } from "../storage/ipop-front-storage.js";
import { IPushBackStorage } from "../storage/ipush-back-storage.js";
import { RingVector } from "../storage/ring-vector.js";
import { SegmentedRingVector } from "../storage/segmented-ring-vector.js";

/**
 * Compliance tests for the `IPushBack`/`IPopFront` (queue-shaped) and, where
 * also declared, `IPushFront` storage capabilities (section 6.1).
 *
 * `ArrayList` does not declare `IPopFront`/`IPushFront` (both are O(n) on a
 * plain array) and is intentionally absent from this suite.
 */
suite.each<{
	description: string;
	factory: Callable<
		[iterator?: Iterable<number>],
		IPushBackStorage<number> & IPopFrontStorage<number> & Iterable<number>
	>;
}>([
	{
		description: "LinkedList",
		factory: (iterator) => new LinkedList(iterator),
	},
	{
		description: "DoublyLinkedList",
		factory: (iterator) => new DoublyLinkedList(iterator),
	},
	{
		description: "CircularArrayList",
		factory: (iterator) => new CircularArrayList(iterator),
	},
	{
		description: "RingVector",
		factory: (iterator) => new RingVector(iterator),
	},
	{
		description: "SegmentedRingVector",
		factory: (iterator) => new SegmentedRingVector(iterator),
	},
])("$description IPushBack/IPopFront compliance", ({ factory }) => {
	test("should dequeue items in FIFO order", () => {
		const list = factory();

		list.pushBackAll([1, 2, 3]);

		expect(list.popFront()).toBe(1);
		expect(list.popFront()).toBe(2);
		expect(list.popFront()).toBe(3);
		expect(list.popFront()).toBeUndefined();
	});

	test("should report the front item without removing it", () => {
		const list = factory([1, 2, 3]);

		expect(list.front()).toBe(1);
		expect(Array.from(list)).toEqual([1, 2, 3]);
	});

	test("should return undefined from front() when empty", () => {
		const list = factory();

		expect(list.front()).toBeUndefined();
	});
});

suite.each<{
	description: string;
	factory: Callable<
		[iterator?: Iterable<number>],
		DoublyLinkedList<number> | CircularArrayList<number>
	>;
}>([
	{
		description: "DoublyLinkedList",
		factory: (iterator) => new DoublyLinkedList(iterator),
	},
	{
		description: "CircularArrayList",
		factory: (iterator) => new CircularArrayList(iterator),
	},
])("$description IPushFront compliance", ({ factory }) => {
	test("should push items at the front, in argument order (Array.prototype.unshift semantics)", () => {
		const list = factory([3, 4]);

		list.pushFrontAll([1, 2]);

		expect(Array.from(list)).toEqual([1, 2, 3, 4]);
	});
});
