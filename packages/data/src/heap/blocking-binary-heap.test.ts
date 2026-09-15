import { expect, suite, test } from "vitest";

import { CollectionCapacityExceededError } from "../collection/ibounded.js";
import { BlockingBinaryHeap } from "./blocking-binary-heap.js";

suite("BlockingBinaryHeap", () => {
	test("should still throw from the synchronous insert when full", () => {
		const heap = new BlockingBinaryHeap<number>((a, b) => a < b, undefined, {
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

	test("should insert into an empty heap through extractAndInsert, and count it", () => {
		const heap = new BlockingBinaryHeap<number>((a, b) => a < b, undefined, {
			capacity: 1,
		});

		expect(heap.extractAndInsert(1)).toBeUndefined();
		expect(heap.count()).toBe(1);
		expect(heap.extractAndInsert(2)).toBe(1);
		expect(heap.count()).toBe(1);
	});

	test("should resolve waitInsert immediately when under capacity", async () => {
		const heap = new BlockingBinaryHeap<number>((a, b) => a < b, undefined, {
			capacity: 2,
		});
		heap.insert(1);

		await heap.waitInsertAll([2]);

		expect(heap.count()).toBe(2);
	});

	test("should block waitInsert until capacity frees up, then insert", async () => {
		const heap = new BlockingBinaryHeap<number>((a, b) => a < b, undefined, {
			capacity: 1,
		});
		heap.insert(1);

		let resolved = false;
		const pending = heap.waitInsert(2).then(() => {
			resolved = true;
		});

		await Promise.resolve();
		expect(resolved).toBe(false);

		heap.extract();
		await pending;

		expect(resolved).toBe(true);
		expect(heap.count()).toBe(1);
		expect(heap.peek()).toBe(2);
	});

	test("should reject a blocked waitInsert when its signal aborts", async () => {
		const heap = new BlockingBinaryHeap<number>((a, b) => a < b, undefined, {
			capacity: 1,
		});
		heap.insert(1);

		const controller = new AbortController();
		const pending = heap.waitInsert(2, controller.signal);

		controller.abort();

		await expect(pending).rejects.toBeDefined();
	});
});
