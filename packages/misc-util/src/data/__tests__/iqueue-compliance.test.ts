import { describe, expect, it } from "vitest";
import type { Callable } from "../../ecma/function/types.js";
import { CollectionCapacityExceededError } from "../abstract-types/icollection.js";
import type { IQueue } from "../abstract-types/iqueue.js";
import { Queue } from "../queue.js";

/**
 * IQueue compliance tests for various data structures.
 *
 * These tests ensure that the data structures adhere to the IQueue interface.
 */

describe.each<{
	description: string;
	factory: Callable<
		[iterator?: Iterable<number>, capacity?: number],
		IQueue<number>
	>;
}>([
	{
		description: "BoundedQueue",
		factory: (iterator, capacity) => new Queue(iterator, capacity),
	},
])("$description IQueue compliance", ({ factory }) => {
	it("should enqueue and dequeue items in FIFO order", async () => {
		const queue: IQueue<number> = factory();
		await queue.enqueue(1);
		await queue.enqueue(2);
		await queue.enqueue(3);

		expect(await queue.dequeue()).toBe(1);
		expect(await queue.dequeue()).toBe(2);
		expect(await queue.dequeue()).toBe(3);
		expect(await queue.dequeue()).toBeUndefined();
	});

	it("should handle initial items correctly", async () => {
		const queue: IQueue<number> = factory([1, 2, 3]);

		expect(await queue.dequeue()).toBe(1);
		expect(await queue.dequeue()).toBe(2);
		expect(await queue.dequeue()).toBe(3);
		expect(await queue.dequeue()).toBeUndefined();
	});

	it("should peek at the front item without removing it", async () => {
		const queue: IQueue<number> = factory([1, 2, 3]);

		expect(await queue.front()).toBe(1);
		expect(await queue.count()).toBe(3);

		await queue.dequeue();
		expect(await queue.front()).toBe(2);
		expect(await queue.count()).toBe(2);
	});

	it("should handle edge cases on empty queue", async () => {
		const queue: IQueue<number> = factory();

		expect(await queue.dequeue()).toBeUndefined();
		expect(await queue.front()).toBeUndefined();
		expect(await queue.count()).toBe(0);
	});

	it("should clear the queue", async () => {
		const queue: IQueue<number> = factory([1, 2, 3]);
		expect(await queue.count()).toBe(3);

		await queue.clear();
		expect(await queue.count()).toBe(0);
		expect(await queue.dequeue()).toBeUndefined();
		expect(await queue.front()).toBeUndefined();
	});

	it("should respect capacity limits", async () => {
		const capacity = 2;
		const queue: IQueue<number> = factory(undefined, capacity);

		await queue.enqueue(1);
		await queue.enqueue(2);
		expect(await queue.count()).toBe(2);

		await expect(async () => await queue.enqueue(3)).rejects.toThrow(
			CollectionCapacityExceededError,
		);

		expect(await queue.count()).toBe(2);
		expect(await queue.dequeue()).toBe(1);
		expect(await queue.count()).toBe(1);

		await queue.enqueue(3);
		expect(await queue.count()).toBe(2);
		expect(await queue.dequeue()).toBe(2);
		expect(await queue.dequeue()).toBe(3);
		expect(await queue.dequeue()).toBeUndefined();
	});

	it("should allow unlimited capacity", async () => {
		const queue: IQueue<number> = factory();

		expect(queue.capacity).toBe(Infinity);
	});
});
