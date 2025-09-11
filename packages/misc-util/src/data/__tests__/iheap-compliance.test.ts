import { describe, expect, it } from "vitest";
import type { Callable } from "../../ecma/function/types.js";
import type { IHeap } from "../abstract-types/iheap.js";
import { BinaryHeap } from "../binary-heap.js";

/**
 * IHeap compliance tests for various data structures.
 *
 * These tests ensure that the data structures adhere to the IHeap interface.
 */

describe.each<{
	description: string;
	factory: Callable<[iterator?: Iterable<number>], IHeap<number>>;
}>([
	{
		description: "BinaryHeap",
		factory: (iterator) => new BinaryHeap((a, b) => a < b, iterator),
	},
])("$description IHeap compliance", ({ factory }) => {
	it("should maintain the heap property on insertions", async () => {
		const heap: IHeap<number> = factory();
		await heap.insert(10);
		await heap.insert(5);
		await heap.insert(20);
		await heap.insert(1);

		expect(await heap.extract()).toBe(1);
		expect(await heap.extract()).toBe(5);
		expect(await heap.extract()).toBe(10);
		expect(await heap.extract()).toBe(20);
		expect(await heap.extract()).toBeUndefined();
	});

	it("should maintain the heap property on extractions", async () => {
		const heap: IHeap<number> = factory([10, 5, 20, 1]);

		expect(await heap.extract()).toBe(1);
		expect(await heap.extract()).toBe(5);
		expect(await heap.extract()).toBe(10);
		expect(await heap.extract()).toBe(20);
		expect(await heap.extract()).toBeUndefined();
	});

	it("should peek at the root element without removing it", async () => {
		const heap: IHeap<number> = factory([10, 5, 20, 1]);

		expect(await heap.root()).toBe(1);
		expect(await heap.count()).toBe(4);

		await heap.extract();
		expect(await heap.root()).toBe(5);
		expect(await heap.count()).toBe(3);
	});

	it("should handle insertAndExtract correctly", async () => {
		const heap: IHeap<number> = factory([10, 5, 20]);

		expect(await heap.insertAndExtract(1)).toBe(1); // New root, should be returned
		expect(await heap.count()).toBe(3);
		expect(await heap.root()).toBe(5);

		expect(await heap.insertAndExtract(15)).toBe(5); // Existing root is smaller, should be returned
		expect(await heap.count()).toBe(3);
		expect(await heap.root()).toBe(10);
	});

	it("should replace the root element correctly", async () => {
		const heap: IHeap<number> = factory([10, 5, 20]);

		expect(await heap.extractAndInsert(1)).toBe(5); // 5 is the old root
		expect(await heap.root()).toBe(1);
		expect(await heap.count()).toBe(3);

		expect(await heap.extractAndInsert(15)).toBe(1); // 1 is the old root
		expect(await heap.root()).toBe(10);
		expect(await heap.count()).toBe(3);

		const emptyHeap: IHeap<number> = factory();
		expect(await emptyHeap.extractAndInsert(10)).toBeUndefined(); // No old root
		expect(await emptyHeap.root()).toBe(10);
		expect(await emptyHeap.count()).toBe(1);
	});

	it("should handle edge cases on empty heap", async () => {
		const heap: IHeap<number> = factory();

		expect(await heap.extract()).toBeUndefined(); // Extract from empty heap
		expect(await heap.root()).toBeUndefined(); // Peek at empty heap
		expect(await heap.insertAndExtract(10)).toBe(10); // Insert and extract from empty heap

		await heap.insert(5);
		expect(await heap.extract()).toBe(5); // Extract the only element
		expect(await heap.extract()).toBeUndefined(); // Now empty again

		expect(await heap.extractAndInsert(20)).toBeUndefined(); // Extract and insert into empty heap
		expect(await heap.root()).toBe(20);
		expect(await heap.count()).toBe(1);
	});

	it("should handle edge cases on falsy values", async () => {
		const heap: IHeap<number> = factory();

		await heap.insert(0);
		await heap.insert(-1);
		await heap.insert(2);
		await heap.insert(1);

		expect(await heap.extract()).toBe(-1);
		expect(await heap.extract()).toBe(0);
		expect(await heap.extract()).toBe(1);
		expect(await heap.extract()).toBe(2);
		expect(await heap.extract()).toBeUndefined();

		expect(await heap.insertAndExtract(0)).toBe(0);
		expect(await heap.count()).toBe(0);

		expect(await heap.extractAndInsert(-5)).toBeUndefined();
		expect(await heap.root()).toBe(-5);
		expect(await heap.count()).toBe(1);
	});

	it("should handle duplicate elements correctly", async () => {
		const heap: IHeap<number> = factory();
		await heap.insert(10);
		await heap.insert(5);
		await heap.insert(10);
		await heap.insert(1);
		await heap.insert(5);

		expect(await heap.extract()).toBe(1);
		expect(await heap.extract()).toBe(5);
		expect(await heap.extract()).toBe(5);
		expect(await heap.extract()).toBe(10);
		expect(await heap.extract()).toBe(10);
		expect(await heap.extract()).toBeUndefined();
	});

	it("mutating the heap using methods from ICollection should work correctly", async () => {
		const heap: IHeap<number> = factory([10, 5, 20, 1, 15]);

		expect(await heap.count()).toBe(5);

		await heap.clear();
		expect(await heap.count()).toBe(0);
		expect(await heap.extract()).toBeUndefined();

		await heap.removeFirst((x) => x === 10); // Removing from empty heap should be no-op
		expect(await heap.count()).toBe(0);

		await heap.insert(30);
		await heap.insert(25);
		expect(await heap.count()).toBe(2);
		expect(await heap.root()).toBe(25);

		await heap.removeFirst((x) => x === 25);
		expect(await heap.count()).toBe(1);
		expect(await heap.root()).toBe(30);

		await heap.replaceFirst((x) => x === 30, 5);
		expect(await heap.count()).toBe(1);
		expect(await heap.root()).toBe(5);

		await heap.replace(
			(x) => x === 5,
			() => 50,
		);
		expect(await heap.count()).toBe(1);
		expect(await heap.root()).toBe(50);
	});
});
