import { expect, suite, test } from "vitest";

import { CollectionCapacityExceededError } from "../collection/ibounded.js";
import { BlockingQueue } from "./blocking-queue.js";

suite("BlockingQueue", () => {
	test("should still throw from the synchronous enqueue when full", () => {
		const queue = new BlockingQueue<number>(undefined, { capacity: 1 });

		queue.enqueue(1);

		expect(() => queue.enqueue(2)).toThrow(CollectionCapacityExceededError);
	});

	test("should resolve waitEnqueue immediately when under capacity", async () => {
		const queue = new BlockingQueue<number>(undefined, { capacity: 2 });
		queue.enqueue(1);

		await queue.waitEnqueueAll([2]);

		expect(Array.from(queue)).toEqual([1, 2]);
	});

	test("should block waitEnqueue until capacity frees up, then enqueue", async () => {
		const queue = new BlockingQueue<number>(undefined, { capacity: 1 });
		queue.enqueue(1);

		let resolved = false;
		const pending = queue.waitEnqueue(2).then(() => {
			resolved = true;
		});

		await Promise.resolve();
		expect(resolved).toBe(false);

		queue.dequeue();
		await pending;

		expect(resolved).toBe(true);
		expect(Array.from(queue)).toEqual([2]);
	});

	test("should reject a blocked waitEnqueue when its signal aborts", async () => {
		const queue = new BlockingQueue<number>(undefined, { capacity: 1 });
		queue.enqueue(1);

		const controller = new AbortController();
		const pending = queue.waitEnqueue(2, controller.signal);

		controller.abort();

		await expect(pending).rejects.toBeDefined();
	});

	test("should never grant room at capacity 0, so every waitEnqueue rendezvouses", async () => {
		const queue = new BlockingQueue<number>(undefined, { capacity: 0 });

		let resolved = false;
		const pending = queue.waitEnqueue(1).then(() => {
			resolved = true;
		});

		await Promise.resolve();
		await Promise.resolve();

		expect(resolved).toBe(false);
		expect(() => queue.enqueue(1)).toThrow(CollectionCapacityExceededError);

		const controller = new AbortController();
		void pending.catch(() => {});
		controller.abort();
	});

	test("should return every permit taken, so capacity never erodes", () => {
		const queue = new BlockingQueue<number>(undefined, { capacity: 3 });

		for (let round = 0; round < 5; round++) {
			queue.enqueueAll([1, 2, 3]);
			expect(() => queue.enqueue(4)).toThrow(CollectionCapacityExceededError);

			expect(queue.dequeue()).toBe(1);
			queue.clear();
		}

		queue.enqueueAll([1, 2, 3]);
		expect(queue.count()).toBe(3);
	});
});
