import type { Callable } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { BlockingQueue } from "../queue/blocking-queue.js";
import { BoundedQueue } from "../queue/bounded-queue.js";
import { IQueue } from "../queue/iqueue.js";
import { LossyQueue } from "../queue/lossy-queue.js";
import { Queue } from "../queue/queue.js";

const CAPACITY = 16;

/**
 * IQueue compliance tests for various data structures.
 *
 * These tests ensure that the data structures adhere to the IQueue interface.
 */

suite.each<{
	description: string;
	factory: Callable<[iterator?: Iterable<number>], IQueue<number>>;
}>([
	{
		description: "Queue",
		factory: (iterator) => new Queue(iterator),
	},
	{
		description: "BoundedQueue",
		factory: (iterator) => new BoundedQueue(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BlockingQueue",
		factory: (iterator) => new BlockingQueue(iterator, { capacity: CAPACITY }),
	},
	{
		description: "LossyQueue",
		factory: (iterator) => new LossyQueue(iterator, { capacity: CAPACITY }),
	},
])("$description IQueue compliance", ({ factory }) => {
	test("should enqueue and dequeue items in FIFO order", () => {
		const queue: IQueue<number> = factory();
		queue.enqueue(1);
		queue.enqueue(2);
		queue.enqueue(3);

		expect(queue.dequeue()).toBe(1);
		expect(queue.dequeue()).toBe(2);
		expect(queue.dequeue()).toBe(3);
		expect(queue.dequeue()).toBeUndefined();
	});

	test("should handle initial items correctly", () => {
		const queue: IQueue<number> = factory([1, 2, 3]);

		expect(queue.dequeue()).toBe(1);
		expect(queue.dequeue()).toBe(2);
		expect(queue.dequeue()).toBe(3);
		expect(queue.dequeue()).toBeUndefined();
	});

	test("should peek at the front item without removing test", () => {
		const queue: IQueue<number> = factory([1, 2, 3]);

		expect(queue.front()).toBe(1);
		expect(queue.count()).toBe(3);

		queue.dequeue();
		expect(queue.front()).toBe(2);
		expect(queue.count()).toBe(2);
	});

	test("should handle edge cases on empty queue", () => {
		const queue: IQueue<number> = factory();

		expect(queue.dequeue()).toBeUndefined();
		expect(queue.front()).toBeUndefined();
		expect(queue.count()).toBe(0);
	});

	test("should clear the queue", () => {
		const queue: IQueue<number> = factory([1, 2, 3]);
		expect(queue.count()).toBe(3);

		queue.clear();
		expect(queue.count()).toBe(0);
		expect(queue.dequeue()).toBeUndefined();
		expect(queue.front()).toBeUndefined();
	});

	test("should enqueueAll in array order", () => {
		const queue: IQueue<number> = factory();

		queue.enqueueAll([1, 2, 3]);

		expect(queue.count()).toBe(3);
		expect(Array.from(queue)).toEqual([1, 2, 3]);
	});

	test("should enqueueAll a single-element array identically to enqueue", () => {
		const queue: IQueue<number> = factory();

		queue.enqueue(1);
		queue.enqueueAll([2]);

		expect(Array.from(queue)).toEqual([1, 2]);
	});

	test("should leave the queue untouched on an empty enqueueAll", () => {
		const queue: IQueue<number> = factory([1]);

		queue.enqueueAll([]);

		expect(queue.count()).toBe(1);
		expect(Array.from(queue)).toEqual([1]);
	});
});
