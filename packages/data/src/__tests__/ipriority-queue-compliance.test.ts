import type { Callable } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { ICollection } from "../collection/icollection.js";
import { IPriorityQueue } from "../priority-queue/ipriority-queue.js";
import { PriorityQueue } from "../priority-queue/priority-queue.js";

/**
 * IPriorityQueue compliance tests for various data structures.
 *
 * These tests ensure that the data structures adhere to the IPriorityQueue
 * interface.
 */

suite.each<{
	description: string;
	factory: Callable<
		[iterator?: Iterable<[string, number]>],
		IPriorityQueue<string, number>
	>;
}>([
	{
		description: "PriorityQueue",
		factory: (iterator) => new PriorityQueue(undefined, iterator),
	},
])("$description IPriorityQueue compliance", ({ factory }) => {
	test("should insertAll every item at the shared priority", () => {
		const queue = factory();

		queue.insert(1, "high");
		queue.insertAll(5, ["low-a", "low-b"]);

		expect(queue.count()).toBe(3);
		expect(queue.extract()).toBe("high");
		expect(
			Array.from(queue.entries()).every((entry) => entry.priority === 5),
		).toBe(true);
	});

	test("should leave the queue untouched on an empty insertAll", () => {
		const queue = factory([["a", 1]]);

		queue.insertAll(2, []);

		expect(queue.count()).toBe(1);
		expect(queue.peek()).toBe("a");
	});

	suite("ICollection compliance", () => {
		test("should iterate over items", () => {
			const collection: ICollection<string> = factory([
				["a", 1],
				["b", 2],
				["c", 3],
			]);

			expect(Array.from(collection)).toEqual(
				expect.arrayContaining(["a", "b", "c"]),
			);
		});

		test("should clear items", () => {
			const collection: ICollection<string> = factory([
				["a", 1],
				["b", 2],
				["c", 3],
			]);

			collection.clear();
			expect(Array.from(collection)).toEqual([]);
		});

		test("should count items", () => {
			const collection: ICollection<string> = factory([
				["a", 1],
				["b", 2],
				["c", 3],
			]);

			expect(collection.count()).toBe(3);
		});
	});

	test("should maintain priority queue behavior", () => {
		const pq: IPriorityQueue<string, number> = factory([
			["task1", 3],
			["task2", 1],
			["task3", 2],
		]);

		expect(pq.count()).toBe(3);
		expect(pq.peek()).toEqual("task2"); // Highest priority (lowest number)

		expect(pq.extract()).toEqual("task2");
		expect(pq.extract()).toEqual("task3");
		expect(pq.extract()).toEqual("task1");
		expect(pq.extract()).toBeUndefined();
		expect(pq.peek()).toBeUndefined();
		expect(pq.count()).toBe(0);
	});

	test("should handle insert correctly", () => {
		const pq: IPriorityQueue<string, number> = factory([
			["task1", 3],
			["task2", 1],
			["task3", 2],
		]);

		pq.insert(0, "task4"); // Highest priority
		expect(pq.peek()).toEqual("task4");
		expect(pq.count()).toBe(4);

		pq.insert(4, "task5"); // Lowest priority
		expect(pq.count()).toBe(5);

		expect(pq.extract()).toEqual("task4");
		expect(pq.extract()).toEqual("task2");
		expect(pq.extract()).toEqual("task3");
		expect(pq.extract()).toEqual("task1");
		expect(pq.extract()).toEqual("task5");
		expect(pq.extract()).toBeUndefined();
	});

	test("should handle set priority correctly", () => {
		const pq: IPriorityQueue<string, number> = factory([
			["task1", 3],
			["task2", 1],
			["task3", 2],
		]);

		pq.setPriority("task1", 0); // Increase priority
		expect(pq.peek()).toEqual("task1");

		pq.setPriority("task2", 4); // Decrease priority
		expect(pq.count()).toBe(3);

		expect(pq.extract()).toEqual("task1");
		expect(pq.extract()).toEqual("task3");
		expect(pq.extract()).toEqual("task2");
		expect(pq.extract()).toBeUndefined();
	});

	test("should return false from setPriority when the item is not found", () => {
		const pq: IPriorityQueue<string, number> = factory([["task1", 1]]);

		expect(pq.setPriority("missing", 0)).toBe(false);
	});

	test("should handle edge cases on empty priority queue", () => {
		const pq: IPriorityQueue<string, number> = factory();

		expect(pq.extract()).toBeUndefined();
		expect(pq.peek()).toBeUndefined();
		expect(pq.count()).toBe(0);

		pq.insert(1, "task1");
		expect(pq.peek()).toEqual("task1");
		expect(pq.count()).toBe(1);

		expect(pq.extract()).toEqual("task1");
		expect(pq.extract()).toBeUndefined();
		expect(pq.peek()).toBeUndefined();
		expect(pq.count()).toBe(0);
	});

	test("should yield entries() in priority order without mutating the queue", () => {
		const pq: IPriorityQueue<string, number> = factory([
			["task1", 3],
			["task2", 1],
			["task3", 2],
		]);

		expect(Array.from(pq.entries())).toEqual([
			{ value: "task2", priority: 1 },
			{ value: "task3", priority: 2 },
			{ value: "task1", priority: 3 },
		]);

		expect(pq.count()).toBe(3);
		expect(pq.peek()).toEqual("task2");
	});
});
