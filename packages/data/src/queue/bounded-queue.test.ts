import { expect, suite, test } from "vitest";

import { CollectionCapacityExceededError } from "../collection/ibounded.js";
import { RingVector } from "../storage/ring-vector.js";
import { BoundedQueue } from "./bounded-queue.js";

suite("BoundedQueue", () => {
	test("should respect capacity limits", () => {
		const queue = new BoundedQueue<number>(undefined, { capacity: 2 });

		queue.enqueue(1);
		queue.enqueue(2);
		expect(queue.count()).toBe(2);

		expect(() => queue.enqueue(3)).toThrow(CollectionCapacityExceededError);

		expect(queue.count()).toBe(2);
		expect(queue.dequeue()).toBe(1);
		expect(queue.count()).toBe(1);

		queue.enqueue(3);
		expect(queue.count()).toBe(2);
		expect(queue.dequeue()).toBe(2);
		expect(queue.dequeue()).toBe(3);
		expect(queue.dequeue()).toBeUndefined();
	});

	test("should reject a bulk enqueue that would overflow, without adding any of it", () => {
		const queue = new BoundedQueue<number>(undefined, { capacity: 3 });

		queue.enqueue(1);

		expect(() => queue.enqueueAll([2, 3, 4])).toThrow(
			CollectionCapacityExceededError,
		);
		expect(Array.from(queue)).toEqual([1]);
	});

	test("should take its capacity from a storage that carries one", () => {
		const queue = new BoundedQueue<number>(undefined, {
			storage: new RingVector<number>(undefined, { capacity: 2 }),
		});

		expect(queue.capacity).toBe(2);
		queue.enqueueAll([1, 2]);
		expect(() => queue.enqueue(3)).toThrow(CollectionCapacityExceededError);
	});

	test("should reject a capacity larger than the storage can hold", () => {
		expect(
			() =>
				new BoundedQueue<number>(undefined, {
					capacity: 5,
					storage: new RingVector<number>(undefined, { capacity: 2 }),
				}),
		).toThrow(RangeError);
	});

	test("should reject an unbounded storage with no capacity option", () => {
		expect(
			() =>
				new BoundedQueue<number>(undefined, {
					storage: new RingVector<number>() as RingVector<number> & {
						capacity: number;
					},
				}),
		).toThrow(RangeError);
	});

	test("should reject an initial iterable larger than the capacity", () => {
		expect(() => new BoundedQueue([1, 2, 3], { capacity: 2 })).toThrow(
			RangeError,
		);
	});
});
