import { expect, suite, test } from "vitest";

import { BinaryHeap } from "./binary-heap.js";

suite("BinaryHeap", () => {
	test("should be unbounded, with no capacity to reach", () => {
		const heap = new BinaryHeap<number>((a, b) => a < b);

		for (let index = 1_000; index > 0; index--) {
			heap.insert(index);
		}

		expect(heap.count()).toBe(1_000);
		expect(heap.extract()).toBe(1);
	});

	test("should heapify an initial iterable", () => {
		const heap = new BinaryHeap<number>((a, b) => a < b, [5, 3, 8, 1]);

		expect(heap.extract()).toBe(1);
		expect(heap.extract()).toBe(3);
		expect(heap.extract()).toBe(5);
		expect(heap.extract()).toBe(8);
	});
});
