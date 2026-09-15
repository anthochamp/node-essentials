import { expect, suite, test } from "vitest";

import { CollectionCapacityExceededError } from "../collection/ibounded.js";
import { BoundedBinaryHeap } from "./bounded-binary-heap.js";

suite("BoundedBinaryHeap", () => {
	test("should respect capacity limits", () => {
		const heap = new BoundedBinaryHeap<number>((a, b) => a < b, undefined, {
			capacity: 2,
		});

		heap.insert(2);
		heap.insert(1);
		expect(heap.count()).toBe(2);

		expect(() => heap.insert(3)).toThrow(CollectionCapacityExceededError);

		expect(heap.count()).toBe(2);
		expect(heap.extract()).toBe(1);
		expect(heap.count()).toBe(1);

		heap.insert(3);
		expect(heap.count()).toBe(2);
		expect(heap.extract()).toBe(2);
		expect(heap.extract()).toBe(3);
		expect(heap.extract()).toBeUndefined();
	});

	test("should leave the count alone through insertAndExtract at capacity", () => {
		const heap = new BoundedBinaryHeap<number>((a, b) => a < b, [2], {
			capacity: 1,
		});

		expect(heap.insertAndExtract(1)).toBe(1);
		expect(heap.count()).toBe(1);
	});

	test("should count the insert extractAndInsert performs on an empty heap", () => {
		const heap = new BoundedBinaryHeap<number>((a, b) => a < b, undefined, {
			capacity: 0,
		});

		expect(() => heap.extractAndInsert(1)).toThrow(
			CollectionCapacityExceededError,
		);
	});
});
