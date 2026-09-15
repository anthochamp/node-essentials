import { expect, suite, test } from "vitest";

import { RingVector } from "../storage/ring-vector.js";
import { Queue } from "./queue.js";

suite("Queue", () => {
	test("should be unbounded, with no capacity to reach", () => {
		const queue = new Queue<number>();

		for (let index = 0; index < 1_000; index++) {
			queue.enqueue(index);
		}

		expect(queue.count()).toBe(1_000);
		expect(queue.dequeue()).toBe(0);
	});

	test("should enqueue a batch in array order", () => {
		const queue = new Queue<number>();

		queue.enqueueAll([1, 2, 3]);

		expect(Array.from(queue)).toEqual([1, 2, 3]);
	});

	test("should accept a caller-supplied storage", () => {
		const storage = new RingVector<number>();
		const queue = new Queue<number>([1, 2], { storage });

		queue.enqueue(3);

		expect(Array.from(storage)).toEqual([1, 2, 3]);
	});
});
