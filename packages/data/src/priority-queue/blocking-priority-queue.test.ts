import { expect, suite, test } from "vitest";

import { CollectionCapacityExceededError } from "../collection/ibounded.js";
import { BlockingPriorityQueue } from "./blocking-priority-queue.js";

suite("BlockingPriorityQueue", () => {
	test("should still throw from the synchronous insert when full", () => {
		const queue = new BlockingPriorityQueue<string>(undefined, undefined, {
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

	test("should return the permit taken by a removed entry", () => {
		const queue = new BlockingPriorityQueue<string>(undefined, undefined, {
			capacity: 2,
		});

		queue.insert(1, "a");
		queue.insert(2, "b");

		expect(queue.remove((value) => value === "a")).toBe(true);
		expect(() => queue.insert(3, "c")).not.toThrow();
		expect(queue.count()).toBe(2);
	});

	test("should resolve waitInsert immediately when under capacity", async () => {
		const queue = new BlockingPriorityQueue<string>(undefined, undefined, {
			capacity: 2,
		});
		queue.insert(1, "a");

		await queue.waitInsertAll(2, ["b"]);

		expect(queue.count()).toBe(2);
	});

	test("should block waitInsert until capacity frees up, then insert", async () => {
		const queue = new BlockingPriorityQueue<string>(undefined, undefined, {
			capacity: 1,
		});
		queue.insert(1, "a");

		let resolved = false;
		const pending = queue.waitInsert(2, "b").then(() => {
			resolved = true;
		});

		await Promise.resolve();
		expect(resolved).toBe(false);

		queue.extract();
		await pending;

		expect(resolved).toBe(true);
		expect(queue.count()).toBe(1);
		expect(queue.peek()).toBe("b");
	});

	test("should reject a blocked waitInsert when its signal aborts", async () => {
		const queue = new BlockingPriorityQueue<string>(undefined, undefined, {
			capacity: 1,
		});
		queue.insert(1, "a");

		const controller = new AbortController();
		const pending = queue.waitInsert(2, "b", controller.signal);

		controller.abort();

		await expect(pending).rejects.toBeDefined();
	});
});
