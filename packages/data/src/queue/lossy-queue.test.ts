import { expect, suite, test } from "vitest";

import { LossyQueue } from "./lossy-queue.js";

suite("LossyQueue", () => {
	test("should throw for a non-positive or infinite capacity", () => {
		expect(() => new LossyQueue(undefined, { capacity: 0 })).toThrow(
			RangeError,
		);
		expect(() => new LossyQueue(undefined, { capacity: -1 })).toThrow(
			RangeError,
		);
		expect(() => new LossyQueue(undefined, { capacity: Infinity })).toThrow(
			RangeError,
		);
	});

	test("should enqueue and dequeue in FIFO order under capacity", () => {
		const queue = new LossyQueue<number>(undefined, { capacity: 5 });

		expect(queue.enqueueAll([1, 2, 3])).toEqual([]);
		expect(Array.from(queue)).toEqual([1, 2, 3]);
		expect(queue.dequeue()).toBe(1);
		expect(queue.dequeue()).toBe(2);
		expect(queue.front()).toBe(3);
		expect(queue.count()).toBe(1);
	});

	test("should evict the front item by default when full", () => {
		const queue = new LossyQueue<number>(undefined, { capacity: 3 });

		expect(queue.enqueueAll([1, 2, 3])).toEqual([]);
		expect(queue.enqueue(4)).toEqual([1]);
		expect(Array.from(queue)).toEqual([2, 3, 4]);

		expect(queue.enqueueAll([5, 6])).toEqual([2, 3]);
		expect(Array.from(queue)).toEqual([4, 5, 6]);
	});

	test("should skip the incoming item under the skip policy", () => {
		const queue = new LossyQueue<number>(undefined, {
			capacity: 3,
			overflowPolicy: "skip",
		});

		expect(queue.enqueueAll([1, 2, 3])).toEqual([]);
		expect(queue.enqueueAll([4, 5])).toEqual([4, 5]);
		expect(Array.from(queue)).toEqual([1, 2, 3]);
	});

	test("should apply overflow policy to an over-long initial iterable", () => {
		const queue = new LossyQueue<number>([1, 2, 3, 4, 5], {
			capacity: 3,
		});

		expect(Array.from(queue)).toEqual([3, 4, 5]);
	});

	test("should return the shared empty array when nothing is dropped", () => {
		const queue = new LossyQueue<number>(undefined, { capacity: 3 });

		const first = queue.enqueue(1);
		const second = queue.enqueueAll([]);

		expect(first).toBe(second);
		expect(first).toEqual([]);
	});

	test("should clear the queue", () => {
		const queue = new LossyQueue<number>([1, 2, 3], { capacity: 3 });

		queue.clear();

		expect(queue.count()).toBe(0);
		expect(queue.dequeue()).toBeUndefined();
		expect(queue.front()).toBeUndefined();
	});
});
