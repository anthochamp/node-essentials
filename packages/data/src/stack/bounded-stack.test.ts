import { expect, suite, test } from "vitest";

import { CollectionCapacityExceededError } from "../collection/ibounded.js";
import { BoundedStack } from "./bounded-stack.js";

suite("BoundedStack", () => {
	test("should respect capacity limits", () => {
		const stack = new BoundedStack<number>(undefined, { capacity: 2 });

		stack.push(1);
		stack.push(2);
		expect(stack.count()).toBe(2);

		expect(() => stack.push(3)).toThrow(CollectionCapacityExceededError);

		expect(stack.count()).toBe(2);
		expect(stack.pop()).toBe(2);
		expect(stack.count()).toBe(1);

		stack.push(3);
		expect(stack.count()).toBe(2);
		expect(stack.pop()).toBe(3);
		expect(stack.pop()).toBe(1);
		expect(stack.pop()).toBeUndefined();
	});

	test("should reject a bulk push that would overflow, without adding any of it", () => {
		const stack = new BoundedStack<number>(undefined, { capacity: 3 });

		stack.push(1);

		expect(() => stack.pushAll([2, 3, 4])).toThrow(
			CollectionCapacityExceededError,
		);
		expect(Array.from(stack)).toEqual([1]);
	});
});
