import { expect, suite, test } from "vitest";

import { Stack } from "./stack.js";

suite("Stack", () => {
	test("should be unbounded, with no capacity to reach", () => {
		const stack = new Stack<number>();

		for (let index = 0; index < 1_000; index++) {
			stack.push(index);
		}

		expect(stack.count()).toBe(1_000);
		expect(stack.pop()).toBe(999);
	});

	test("should push a batch so that the last element pops first", () => {
		const stack = new Stack<number>();

		stack.pushAll([1, 2, 3]);

		expect(stack.pop()).toBe(3);
		expect(stack.pop()).toBe(2);
		expect(stack.pop()).toBe(1);
	});
});
