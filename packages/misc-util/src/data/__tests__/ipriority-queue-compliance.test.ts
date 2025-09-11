import { describe, expect, it } from "vitest";
import type { Callable } from "../../ecma/function/types.js";
import type { ICollection } from "../abstract-types/icollection.js";
import type { IPriorityQueue } from "../abstract-types/ipriority-queue.js";
import { PriorityQueue } from "../priority-queue.js";

/**
 * IPriorityQueue compliance tests for various data structures.
 *
 * These tests ensure that the data structures adhere to the IPriorityQueue interface.
 */

describe.each<{
	description: string;
	factory: Callable<
		[iterator?: Iterable<[string, number]>],
		IPriorityQueue<string, number>
	>;
}>([
	{
		description: "PriorityQueue",
		factory: (iterator) => new PriorityQueue(iterator),
	},
])("$description IPriorityQueue compliance", ({ factory }) => {
	describe("ICollection compliance", () => {
		it("should iterate over items", async () => {
			const collection: ICollection<[string, number]> = factory([
				["a", 1],
				["b", 2],
				["c", 3],
			]);

			expect(await Array.fromAsync(collection)).toEqual(
				expect.arrayContaining([
					["a", 1],
					["b", 2],
					["c", 3],
				]),
			);
		});

		it("should clear items", async () => {
			const collection: ICollection<[string, number]> = factory([
				["a", 1],
				["b", 2],
				["c", 3],
			]);

			await collection.clear();
			expect(await Array.fromAsync(collection)).toEqual([]);
		});

		it("should count items", async () => {
			const collection: ICollection<[string, number]> = factory([
				["a", 1],
				["b", 2],
				["c", 3],
			]);

			expect(await collection.count()).toBe(3);
		});

		it("should concatenate items", async () => {
			const collection: ICollection<[string, number]> = factory([
				["a", 1],
				["b", 2],
				["c", 3],
			]);

			const concatenatedItems = await Array.fromAsync(
				collection.concat(["d", 4], ["e", 5], ["f", 6]),
			);
			expect(concatenatedItems).toEqual(
				expect.arrayContaining([
					["a", 1],
					["b", 2],
					["c", 3],
					["d", 4],
					["e", 5],
					["f", 6],
				]),
			);

			// Ensure original collection is unchanged
			const originalItems = await Array.fromAsync(collection);
			expect(originalItems).toEqual(
				expect.arrayContaining([
					["a", 1],
					["b", 2],
					["c", 3],
				]),
			);
		});

		it("should remove the first matching item", async () => {
			const collection: ICollection<[string, number]> = factory([
				["a", 1],
				["b", 2],
				["c", 3],
				["d", 4],
				["e", 5],
			]);

			const removedItem = await collection.removeFirst(
				(item) => item[1] % 2 === 0,
			);
			expect(removedItem).toBe(true);

			const items = await Array.fromAsync(collection);
			expect(items.length).toBe(4);
			expect(items).toEqual(
				expect.arrayContaining([
					["a", 1],
					["c", 3],
					["e", 5],
				]),
			);

			const evenItems = items.filter((item) => item[1] % 2 === 0);
			expect(evenItems.length).toBe(1);
			expect(evenItems[0]).toBeOneOf([
				["b", 2],
				["d", 4],
			]);
		});

		it("should remove all matching items", async () => {
			const collection: ICollection<[string, number]> = factory([
				["a", 1],
				["b", 2],
				["c", 3],
				["d", 4],
				["e", 5],
			]);

			const removedItems = await Array.fromAsync(
				await collection.remove((item) => item[1] % 2 === 0),
			);
			expect(removedItems).toEqual(
				expect.arrayContaining([
					["b", 2],
					["d", 4],
				]),
			);

			const items = await Array.fromAsync(collection);
			expect(items.length).toBe(3);
			expect(items).toEqual(
				expect.arrayContaining([
					["a", 1],
					["c", 3],
					["e", 5],
				]),
			);
		});

		it("should replace the first matching item", async () => {
			const collection: ICollection<[string, number]> = factory([
				["a", 1],
				["b", 2],
				["c", 3],
				["d", 4],
				["e", 5],
			]);
			const replaced = await collection.replaceFirst(
				(item) => item[1] % 2 === 0,
				["t", 20],
			);
			expect(replaced).toBe(true);

			const items = await Array.fromAsync(collection);
			expect(items).toEqual(
				expect.arrayContaining([
					["a", 1],
					["c", 3],
					["e", 5],
					["t", 20],
				]),
			);

			const evenItems = items.filter(
				(item) => item[1] % 2 === 0 && !(item[0] === "t" && item[1] === 20),
			);
			expect(evenItems.length).toBe(1);
			expect(evenItems[0]).toBeOneOf([
				["b", 2],
				["d", 4],
			]); // Depending on which even item was replaced
		});

		it("should replace all matching items", async () => {
			const collection: ICollection<[string, number]> = factory([
				["a", 1],
				["b", 2],
				["c", 3],
				["d", 4],
				["e", 5],
			]);
			const replacedItems = await Array.fromAsync(
				await collection.replace(
					(item) => item[1] % 2 === 0,
					() => ["t", 20],
				),
			);
			expect(replacedItems).toEqual(
				expect.arrayContaining([
					["b", 2],
					["d", 4],
				]),
			);

			const items = await Array.fromAsync(collection);
			expect(items.length).toBe(5);
			expect(items).toEqual(
				expect.arrayContaining([
					["a", 1],
					["t", 20],
					["c", 3],
					["t", 20],
					["e", 5],
				]),
			);
		});
	});

	it("should maintain priority queue behavior", async () => {
		const pq: IPriorityQueue<string, number> = factory([
			["task1", 3],
			["task2", 1],
			["task3", 2],
		]);

		expect(await pq.count()).toBe(3);
		expect(await pq.peek()).toEqual("task2"); // Highest priority (lowest number)

		expect(await pq.extract()).toEqual("task2");
		expect(await pq.extract()).toEqual("task3");
		expect(await pq.extract()).toEqual("task1");
		expect(await pq.extract()).toBeUndefined();
		expect(await pq.peek()).toBeUndefined();
		expect(await pq.count()).toBe(0);
	});

	it("should handle insert correctly", async () => {
		const pq: IPriorityQueue<string, number> = factory([
			["task1", 3],
			["task2", 1],
			["task3", 2],
		]);

		await pq.insert(0, "task4"); // Highest priority
		expect(await pq.peek()).toEqual("task4");
		expect(await pq.count()).toBe(4);

		await pq.insert(4, "task5"); // Lowest priority
		expect(await pq.count()).toBe(5);

		expect(await pq.extract()).toEqual("task4");
		expect(await pq.extract()).toEqual("task2");
		expect(await pq.extract()).toEqual("task3");
		expect(await pq.extract()).toEqual("task1");
		expect(await pq.extract()).toEqual("task5");
		expect(await pq.extract()).toBeUndefined();
	});

	it("should handle set priority correctly", async () => {
		const pq: IPriorityQueue<string, number> = factory([
			["task1", 3],
			["task2", 1],
			["task3", 2],
		]);

		await pq.setPriority("task1", 0); // Increase priority
		expect(await pq.peek()).toEqual("task1");

		await pq.setPriority("task2", 4); // Decrease priority
		expect(await pq.count()).toBe(3);

		expect(await pq.extract()).toEqual("task1");
		expect(await pq.extract()).toEqual("task3");
		expect(await pq.extract()).toEqual("task2");
		expect(await pq.extract()).toBeUndefined();
	});

	it("should handle edge cases on empty priority queue", async () => {
		const pq: IPriorityQueue<string, number> = factory();

		expect(await pq.extract()).toBeUndefined();
		expect(await pq.peek()).toBeUndefined();
		expect(await pq.count()).toBe(0);

		await pq.insert(1, "task1");
		expect(await pq.peek()).toEqual("task1");
		expect(await pq.count()).toBe(1);

		expect(await pq.extract()).toEqual("task1");
		expect(await pq.extract()).toBeUndefined();
		expect(await pq.peek()).toBeUndefined();
		expect(await pq.count()).toBe(0);
	});
});
