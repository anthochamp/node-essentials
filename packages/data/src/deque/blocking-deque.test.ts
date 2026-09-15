import { expect, test } from "vitest";

import { CollectionCapacityExceededError } from "../collection/ibounded.js";
import { BlockingDeque } from "./blocking-deque.js";

test("should respect capacity limits", () => {
	const deque = new BlockingDeque<number>(undefined, { capacity: 2 });

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

test("should resolve waitPush immediately when under capacity", async () => {
	const deque = new BlockingDeque<number>(undefined, { capacity: 2 });
	deque.push(1);

	await deque.waitPushAll([2]);

	expect(Array.from(deque)).toEqual([1, 2]);
});

test("should block waitPush until capacity frees up, then push", async () => {
	const deque = new BlockingDeque<number>(undefined, { capacity: 1 });
	deque.push(1);

	let resolved = false;
	const pending = deque.waitPush(2).then(() => {
		resolved = true;
	});

	await Promise.resolve();
	expect(resolved).toBe(false);

	deque.shift();
	await pending;

	expect(resolved).toBe(true);
	expect(Array.from(deque)).toEqual([2]);
});

test("should reject a blocked waitPush when its signal aborts", async () => {
	const deque = new BlockingDeque<number>(undefined, { capacity: 1 });
	deque.push(1);

	const controller = new AbortController();
	const pending = deque.waitPush(2, controller.signal);

	controller.abort();

	await expect(pending).rejects.toBeDefined();
});

test("should resolve waitUnshift immediately when under capacity", async () => {
	const deque = new BlockingDeque<number>(undefined, { capacity: 2 });
	deque.push(1);

	await deque.waitUnshiftAll([0]);

	expect(Array.from(deque)).toEqual([0, 1]);
});

test("should block waitUnshift until capacity frees up, then unshift", async () => {
	const deque = new BlockingDeque<number>(undefined, { capacity: 1 });
	deque.push(1);

	let resolved = false;
	const pending = deque.waitUnshift(0).then(() => {
		resolved = true;
	});

	await Promise.resolve();
	expect(resolved).toBe(false);

	deque.pop();
	await pending;

	expect(resolved).toBe(true);
	expect(Array.from(deque)).toEqual([0]);
});

test("should reject a blocked waitUnshift when its signal aborts", async () => {
	const deque = new BlockingDeque<number>(undefined, { capacity: 1 });
	deque.push(1);

	const controller = new AbortController();
	const pending = deque.waitUnshift(0, controller.signal);

	controller.abort();

	await expect(pending).rejects.toBeDefined();
});
