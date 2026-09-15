import { expect, suite, test } from "vitest";

import { CollectionCapacityExceededError } from "../collection/ibounded.js";
import { BoundedPriorityQueue } from "./bounded-priority-queue.js";

suite("BoundedPriorityQueue", () => {
	test("should respect capacity limits", () => {
		const queue = new BoundedPriorityQueue<string>(undefined, undefined, {
			capacity: 2,
		});

		queue.insert(2, "low");
		queue.insert(1, "high");
		expect(queue.count()).toBe(2);

		expect(() => queue.insert(3, "over")).toThrow(
			CollectionCapacityExceededError,
		);

		expect(queue.count()).toBe(2);
		expect(queue.extract()).toBe("high");
		expect(queue.count()).toBe(1);
	});

	test("should keep forwarding the non-interface extras", () => {
		const queue = new BoundedPriorityQueue<string>(undefined, undefined, {
			capacity: 3,
		});

		queue.insert(2, "b");
		queue.insert(1, "a");
		queue.insert(3, "c");

		expect(queue.setPriority("c", 0)).toBe(true);
		expect(queue.peek()).toBe("c");

		expect(Array.from(queue.entries(), (entry) => entry.value)).toEqual([
			"c",
			"a",
			"b",
		]);

		expect(queue.remove((value) => value === "a")).toBe(true);
		expect(queue.count()).toBe(2);
	});
});
