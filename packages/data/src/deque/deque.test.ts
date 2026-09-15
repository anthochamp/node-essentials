import { expect, test } from "vitest";

import { DoublyLinkedList } from "../list/doubly-linked-list.js";
import { Deque } from "./deque.js";

test("should be unbounded, with no capacity to reach", () => {
	const deque = new Deque<number>();

	for (let index = 0; index < 1_000; index++) {
		if (index % 2 === 0) {
			deque.push(index);
		} else {
			deque.unshift(index);
		}
	}

	expect(deque.count()).toBe(1_000);
	expect(deque.front()).toBe(999);
	expect(deque.back()).toBe(998);
});

test("should unshift a batch so that the first element ends up at the front", () => {
	const deque = new Deque<number>([3]);

	deque.unshiftAll([1, 2]);

	expect(Array.from(deque)).toEqual([1, 2, 3]);
});

test("should work over a linked backing when elements must survive splicing", () => {
	const deque = new Deque<number>([1, 2, 3], {
		storage: new DoublyLinkedList<number>(),
	});

	expect(deque.pop()).toBe(3);
	expect(deque.shift()).toBe(1);
	expect(Array.from(deque)).toEqual([2]);
});
