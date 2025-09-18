import { expect, suite, test } from "vitest";
import type { Callable } from "../../ecma/function/types.js";
import type { ICollection } from "../abstract-types/icollection.js";
import { BinaryHeap } from "../binary-heap.js";
import { Deque } from "../deque.js";
import { DoublyLinkedList } from "../doubly-linked-list.js";
import { LinkedList } from "../linked-list.js";
import { NativeArray } from "../native-array.js";
import { Queue } from "../queue.js";
import { Stack } from "../stack.js";

/**
 * ICollection compliance tests for various data structures.
 *
 * These tests ensure that the data structures adhere to the ICollection interface.
 *
 * Note: If you are editing this file to add a new data structure, please also
 * update the ICollection compliance tests in the `ipriority-queue-compliance.test.ts` file.
 */

suite.each<{
	description: string;
	factory: Callable<[iterator?: Iterable<number>], ICollection<number>>;
}>([
	{
		description: "BinaryHeap",
		factory: (iterator) => new BinaryHeap((a, b) => a < b, iterator),
	},
	{ description: "Deque", factory: (iterator) => new Deque(iterator) },
	{
		description: "DoublyLinkedList",
		factory: (iterator) => new DoublyLinkedList(iterator),
	},
	{
		description: "LinkedList",
		factory: (iterator) => new LinkedList(iterator),
	},
	{
		description: "NativeList",
		factory: (iterator) => new NativeArray(iterator),
	},
	{ description: "Queue", factory: (iterator) => new Queue(iterator) },
	{ description: "Stack", factory: (iterator) => new Stack(iterator) },
])("$description ICollection compliance", ({ factory }) => {
	test("should iterate over items", async () => {
		const collection: ICollection<number> = factory([1, 2, 3]);

		expect(await Array.fromAsync(collection)).toEqual(
			expect.arrayContaining([1, 2, 3]),
		);
	});

	test("should clear items", async () => {
		const collection: ICollection<number> = factory([1, 2, 3]);

		await collection.clear();
		expect(await Array.fromAsync(collection)).toEqual([]);
	});

	test("should count items", async () => {
		const collection: ICollection<number> = factory([1, 2, 3]);

		expect(await collection.count()).toBe(3);
	});

	test("should concatenate items", async () => {
		const collection: ICollection<number> = factory([1, 2, 3]);

		const concatenatedItems = await Array.fromAsync(collection.concat(4, 5, 6));
		expect(concatenatedItems).toEqual(
			expect.arrayContaining([1, 2, 3, 4, 5, 6]),
		);

		// Ensure original collection is unchanged
		const originalItems = await Array.fromAsync(collection);
		expect(originalItems).toEqual(expect.arrayContaining([1, 2, 3]));
	});

	test("should remove the first matching item", async () => {
		const collection: ICollection<number> = factory([1, 2, 3, 4, 5]);

		const removedItem = await collection.removeFirst((item) => item % 2 === 0);
		expect(removedItem).toBe(true);

		const items = await Array.fromAsync(collection);
		expect(items.length).toBe(4);
		expect(items).toEqual(expect.arrayContaining([1, 3, 5]));

		const evenItems = items.filter((item) => item % 2 === 0);
		expect(evenItems.length).toBe(1);
		expect(evenItems[0]).toBeOneOf([2, 4]);
	});

	test("should remove all matching items", async () => {
		const collection: ICollection<number> = factory([1, 2, 3, 4, 5]);

		const removedItems = await Array.fromAsync(
			await collection.remove((item) => item % 2 === 0),
		);
		expect(removedItems).toEqual(expect.arrayContaining([2, 4]));

		const items = await Array.fromAsync(collection);
		expect(items.length).toBe(3);
		expect(items).toEqual(expect.arrayContaining([1, 3, 5]));
	});

	test("should replace the first matching item", async () => {
		const collection: ICollection<number> = factory([1, 2, 3, 4, 5]);
		const replaced = await collection.replaceFirst(
			(item) => item % 2 === 0,
			20,
		);
		expect(replaced).toBe(true);

		const items = await Array.fromAsync(collection);
		expect(items).toEqual(expect.arrayContaining([1, 3, 5, 20]));

		const evenItems = items.filter((item) => item % 2 === 0 && item !== 20);
		expect(evenItems.length).toBe(1);
		expect(evenItems[0]).toBeOneOf([2, 4]); // Depending on which even item was replaced
	});

	test("should replace all matching items", async () => {
		const collection: ICollection<number> = factory([1, 2, 3, 4, 5]);
		const replacedItems = await Array.fromAsync(
			await collection.replace(
				(item) => item % 2 === 0,
				() => 20,
			),
		);
		expect(replacedItems).toEqual(expect.arrayContaining([2, 4]));

		const items = await Array.fromAsync(collection);
		expect(items.length).toBe(5);
		expect(items).toEqual(expect.arrayContaining([1, 20, 3, 20, 5]));
	});
});
