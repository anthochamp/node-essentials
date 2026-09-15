import { expect, suite, test } from "vitest";

import { PriorityQueue } from "./priority-queue.js";

suite("PriorityQueue", () => {
	test("should be unbounded, with no capacity to reach", () => {
		const queue = new PriorityQueue<number>();

		for (let index = 1_000; index > 0; index--) {
			queue.insert(index, index);
		}

		expect(queue.count()).toBe(1_000);
		expect(queue.extract()).toBe(1);
	});

	test("should extract in priority order regardless of insertion order", () => {
		const queue = new PriorityQueue<string>();

		queue.insert(2, "low");
		queue.insert(1, "high");

		expect(queue.extract()).toBe("high");
		expect(queue.extract()).toBe("low");
		expect(queue.extract()).toBeUndefined();
	});

	test("should reorder an entry through setPriority", () => {
		const queue = new PriorityQueue<string>(undefined, [
			["a", 1],
			["b", 2],
		]);

		expect(queue.setPriority("b", 0)).toBe(true);
		expect(queue.peek()).toBe("b");
	});
});
