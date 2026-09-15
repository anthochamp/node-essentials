import type { Callable } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { BinaryHeap } from "../heap/binary-heap.js";
import type { IHeap } from "../heap/iheap.js";

/**
 * IHeap compliance tests for various data structures.
 *
 * These tests ensure that the data structures adhere to the IHeap interface.
 */

suite.each<{
	description: string;
	factory: Callable<[iterator?: Iterable<number>], IHeap<number>>;
}>([
	{
		description: "BinaryHeap",
		factory: (iterator) => new BinaryHeap((a, b) => a < b, iterator),
	},
])("$description IHeap compliance", ({ factory }) => {
	test("should maintain the heap property on insertions", () => {
		const heap: IHeap<number> = factory();
		heap.insert(10);
		heap.insert(5);
		heap.insert(20);
		heap.insert(1);

		expect(heap.extract()).toBe(1);
		expect(heap.extract()).toBe(5);
		expect(heap.extract()).toBe(10);
		expect(heap.extract()).toBe(20);
		expect(heap.extract()).toBeUndefined();
	});

	test("should maintain the heap property on extractions", () => {
		const heap: IHeap<number> = factory([10, 5, 20, 1]);

		expect(heap.extract()).toBe(1);
		expect(heap.extract()).toBe(5);
		expect(heap.extract()).toBe(10);
		expect(heap.extract()).toBe(20);
		expect(heap.extract()).toBeUndefined();
	});

	test("should maintain the heap property across insertAll", () => {
		const heap: IHeap<number> = factory();

		heap.insertAll([10, 5, 20, 1]);

		expect(heap.count()).toBe(4);
		expect(heap.extract()).toBe(1);
		expect(heap.extract()).toBe(5);
		expect(heap.extract()).toBe(10);
		expect(heap.extract()).toBe(20);
	});

	test("should leave the heap untouched on an empty insertAll", () => {
		const heap: IHeap<number> = factory([1]);

		heap.insertAll([]);

		expect(heap.count()).toBe(1);
		expect(heap.peek()).toBe(1);
	});

	test("should peek at the root element without removing test", () => {
		const heap: IHeap<number> = factory([10, 5, 20, 1]);

		expect(heap.peek()).toBe(1);
		expect(heap.count()).toBe(4);

		heap.extract();
		expect(heap.peek()).toBe(5);
		expect(heap.count()).toBe(3);
	});

	test("should handle insertAndExtract correctly", () => {
		const heap: IHeap<number> = factory([10, 5, 20]);

		expect(heap.insertAndExtract(1)).toBe(1); // New root, should be returned
		expect(heap.count()).toBe(3);
		expect(heap.peek()).toBe(5);

		expect(heap.insertAndExtract(15)).toBe(5); // Existing root is smaller, should be returned
		expect(heap.count()).toBe(3);
		expect(heap.peek()).toBe(10);
	});

	test("should replace the root element correctly", () => {
		const heap: IHeap<number> = factory([10, 5, 20]);

		expect(heap.extractAndInsert(1)).toBe(5); // 5 is the old root
		expect(heap.peek()).toBe(1);
		expect(heap.count()).toBe(3);

		expect(heap.extractAndInsert(15)).toBe(1); // 1 is the old root
		expect(heap.peek()).toBe(10);
		expect(heap.count()).toBe(3);

		const emptyHeap: IHeap<number> = factory();
		expect(emptyHeap.extractAndInsert(10)).toBeUndefined(); // No old root
		expect(emptyHeap.peek()).toBe(10);
		expect(emptyHeap.count()).toBe(1);
	});

	test("should handle edge cases on empty heap", () => {
		const heap: IHeap<number> = factory();

		expect(heap.extract()).toBeUndefined(); // Extract from empty heap
		expect(heap.peek()).toBeUndefined(); // Peek at empty heap
		expect(heap.insertAndExtract(10)).toBe(10); // Insert and extract from empty heap

		heap.insert(5);
		expect(heap.extract()).toBe(5); // Extract the only element
		expect(heap.extract()).toBeUndefined(); // Now empty again

		expect(heap.extractAndInsert(20)).toBeUndefined(); // Extract and insert into empty heap
		expect(heap.peek()).toBe(20);
		expect(heap.count()).toBe(1);
	});

	test("should handle edge cases on falsy values", () => {
		const heap: IHeap<number> = factory();

		heap.insert(0);
		heap.insert(-1);
		heap.insert(2);
		heap.insert(1);

		expect(heap.extract()).toBe(-1);
		expect(heap.extract()).toBe(0);
		expect(heap.extract()).toBe(1);
		expect(heap.extract()).toBe(2);
		expect(heap.extract()).toBeUndefined();

		expect(heap.insertAndExtract(0)).toBe(0);
		expect(heap.count()).toBe(0);

		expect(heap.extractAndInsert(-5)).toBeUndefined();
		expect(heap.peek()).toBe(-5);
		expect(heap.count()).toBe(1);
	});

	test("should handle duplicate elements correctly", () => {
		const heap: IHeap<number> = factory();
		heap.insert(10);
		heap.insert(5);
		heap.insert(10);
		heap.insert(1);
		heap.insert(5);

		expect(heap.extract()).toBe(1);
		expect(heap.extract()).toBe(5);
		expect(heap.extract()).toBe(5);
		expect(heap.extract()).toBe(10);
		expect(heap.extract()).toBe(10);
		expect(heap.extract()).toBeUndefined();
	});

	test("should clear the heap", () => {
		const heap: IHeap<number> = factory([10, 5, 20, 1, 15]);

		expect(heap.count()).toBe(5);

		heap.clear();
		expect(heap.count()).toBe(0);
		expect(heap.extract()).toBeUndefined();
	});
});
