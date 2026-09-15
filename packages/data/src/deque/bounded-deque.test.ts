import { expect, test } from "vitest";

import { CollectionCapacityExceededError } from "../collection/ibounded.js";
import { BoundedDeque } from "./bounded-deque.js";

test("should respect capacity limits at both ends", () => {
	const deque = new BoundedDeque<number>(undefined, { capacity: 2 });

	deque.push(1);
	deque.push(2);
	expect(deque.count()).toBe(2);

	expect(() => deque.push(3)).toThrow(CollectionCapacityExceededError);
	expect(() => deque.unshift(3)).toThrow(CollectionCapacityExceededError);

	expect(deque.count()).toBe(2);
	expect(deque.shift()).toBe(1);
	expect(deque.count()).toBe(1);

	deque.push(3);
	expect(deque.count()).toBe(2);
	expect(deque.shift()).toBe(2);
	expect(deque.shift()).toBe(3);
	expect(deque.shift()).toBeUndefined();
});

test("should reject a bulk push that would overflow, without adding any of it", () => {
	const deque = new BoundedDeque<number>(undefined, { capacity: 3 });

	deque.push(1);

	expect(() => deque.pushAll([2, 3, 4])).toThrow(
		CollectionCapacityExceededError,
	);
	expect(Array.from(deque)).toEqual([1]);
});
