import type { Callable } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { ArrayList } from "../list/array-list.js";
import { CircularArrayList } from "../list/circular-array-list.js";
import { DoublyLinkedList } from "../list/doubly-linked-list.js";
import { IPopBackStorage } from "../storage/ipop-back-storage.js";
import { IPushBackStorage } from "../storage/ipush-back-storage.js";
import { RingVector } from "../storage/ring-vector.js";
import { SegmentedRingVector } from "../storage/segmented-ring-vector.js";

/**
 * Compliance tests for the `IPushBack`/`IPopBack` storage capabilities (section
 * 6.1) shared by every backing that declares them.
 *
 * `LinkedList` (singly) does not declare `IPopBack` (unlinking its tail is
 * Θ(n)) and is intentionally absent from this suite.
 */
suite.each<{
	description: string;
	factory: Callable<
		[iterator?: Iterable<number>],
		IPushBackStorage<number> & IPopBackStorage<number> & Iterable<number>
	>;
}>([
	{
		description: "ArrayList",
		factory: (iterator) => new ArrayList(iterator),
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
])("$description IPushBack/IPopBack compliance", ({ factory }) => {
	test("should push items at the back", () => {
		const list = factory();

		list.pushBackAll([1, 2, 3]);

		expect(Array.from(list)).toEqual([1, 2, 3]);
	});

	test("should push a single item at the back without an array", () => {
		const list = factory();

		list.pushBack(1);
		list.pushBack(2);

		expect(Array.from(list)).toEqual([1, 2]);
	});

	test("should ignore an empty bulk push", () => {
		const list = factory([1]);

		list.pushBackAll([]);

		expect(Array.from(list)).toEqual([1]);
	});

	test("should pop items from the back in reverse insertion order", () => {
		const list = factory([1, 2, 3]);

		expect(list.popBack()).toBe(3);
		expect(list.popBack()).toBe(2);
		expect(list.popBack()).toBe(1);
		expect(list.popBack()).toBeUndefined();
	});

	test("should report the back item without removing it", () => {
		const list = factory([1, 2, 3]);

		expect(list.back()).toBe(3);
		expect(Array.from(list)).toEqual([1, 2, 3]);
	});

	test("should return undefined from back() when empty", () => {
		const list = factory();

		expect(list.back()).toBeUndefined();
	});
});
