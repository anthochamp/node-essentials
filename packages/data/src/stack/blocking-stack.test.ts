import { expect, suite, test } from "vitest";

import { CollectionCapacityExceededError } from "../collection/ibounded.js";
import { BlockingStack } from "./blocking-stack.js";

suite("BlockingStack", () => {
	test("should still throw from the synchronous push when full", () => {
		const stack = new BlockingStack<number>(undefined, { capacity: 1 });

		stack.push(1);

		expect(() => stack.push(2)).toThrow(CollectionCapacityExceededError);
	});

	test("should resolve waitPush immediately when under capacity", async () => {
		const stack = new BlockingStack<number>(undefined, { capacity: 2 });
		stack.push(1);

		await stack.waitPushAll([2]);

		expect(Array.from(stack)).toEqual([1, 2]);
	});

	test("should block waitPush until capacity frees up, then push", async () => {
		const stack = new BlockingStack<number>(undefined, { capacity: 1 });
		stack.push(1);

		let resolved = false;
		const pending = stack.waitPush(2).then(() => {
			resolved = true;
		});

		await Promise.resolve();
		expect(resolved).toBe(false);

		stack.pop();
		await pending;

		expect(resolved).toBe(true);
		expect(Array.from(stack)).toEqual([2]);
	});

	test("should reject a blocked waitPush when its signal aborts", async () => {
		const stack = new BlockingStack<number>(undefined, { capacity: 1 });
		stack.push(1);

		const controller = new AbortController();
		const pending = stack.waitPush(2, controller.signal);

		controller.abort();

		await expect(pending).rejects.toBeDefined();
	});
});
