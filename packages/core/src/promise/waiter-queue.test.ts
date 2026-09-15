import { expect, suite, test } from "vitest";

import { WaiterQueue } from "./waiter-queue.js";

suite("WaiterQueue", () => {
	test("enqueue resolves once released", async () => {
		const queue = new WaiterQueue<string>();

		const promise = queue.enqueue(undefined);
		expect(queue.size).toBe(1);

		expect(queue.releaseNext("hello")).toBe(true);
		expect(queue.size).toBe(0);
		await expect(promise).resolves.toBe("hello");
	});

	test("releaseNext on an empty queue returns false", () => {
		const queue = new WaiterQueue<void>();
		expect(queue.releaseNext(undefined)).toBe(false);
	});

	test("releases waiters in FIFO order", async () => {
		const queue = new WaiterQueue<number>();
		const order: number[] = [];

		const first = queue.enqueue(undefined).then((v) => order.push(v));
		const second = queue.enqueue(undefined).then((v) => order.push(v));

		queue.releaseNext(1);
		queue.releaseNext(2);

		await Promise.all([first, second]);
		expect(order).toEqual([1, 2]);
	});

	test("peek reports the longest-waiting entry's metadata without removing it", () => {
		const queue = new WaiterQueue<void, number>();
		void queue.enqueue(3);
		void queue.enqueue(5);

		expect(queue.peek()).toBe(3);
		expect(queue.size).toBe(2);
	});

	test("peek returns undefined when empty", () => {
		const queue = new WaiterQueue<void, number>();
		expect(queue.peek()).toBeUndefined();
	});

	test("releaseAll resolves every queued waiter in order and clears the queue", async () => {
		const queue = new WaiterQueue<number>();
		const order: number[] = [];

		const promises = [
			queue.enqueue(undefined).then((v) => order.push(v)),
			queue.enqueue(undefined).then((v) => order.push(v)),
			queue.enqueue(undefined).then((v) => order.push(v)),
		];

		expect(queue.releaseAll(9)).toBe(3);
		expect(queue.size).toBe(0);

		await Promise.all(promises);
		expect(order).toEqual([9, 9, 9]);
	});

	test("releaseMatching releases only entries whose metadata matches, preserving queue order", async () => {
		const queue = new WaiterQueue<void, number>();
		const released: number[] = [];

		const waiters = [1, 2, 1, 3].map((target) =>
			queue.enqueue(target).then(() => released.push(target)),
		);

		expect(queue.releaseMatching((extra) => extra === 1, undefined)).toBe(2);
		expect(queue.size).toBe(2);

		await Promise.all([waiters[0], waiters[2]]);
		expect(released).toEqual([1, 1]);
	});

	test("rejects immediately if the signal is already aborted", async () => {
		const controller = new AbortController();
		controller.abort(new Error("pre-aborted"));

		const queue = new WaiterQueue<void>();
		await expect(queue.enqueue(undefined, controller.signal)).rejects.toThrow(
			"pre-aborted",
		);
		expect(queue.size).toBe(0);
	});

	test("rejects and removes the waiter when the signal aborts while pending", async () => {
		const controller = new AbortController();
		const queue = new WaiterQueue<void>();

		const promise = queue.enqueue(undefined, controller.signal);
		expect(queue.size).toBe(1);

		controller.abort(new Error("cancelled"));

		await expect(promise).rejects.toThrow("cancelled");
		expect(queue.size).toBe(0);
	});

	test("a settled waiter is not affected by a later abort", async () => {
		const controller = new AbortController();
		const queue = new WaiterQueue<string>();

		const promise = queue.enqueue(undefined, controller.signal);
		queue.releaseNext("done");
		await expect(promise).resolves.toBe("done");

		// Must not throw or otherwise affect an already-settled waiter.
		controller.abort(new Error("too late"));
	});
});
