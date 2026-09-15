import type { Callable } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { BlockingStack } from "../stack/blocking-stack.js";
import { BoundedStack } from "../stack/bounded-stack.js";
import { IStack } from "../stack/istack.js";
import { Stack } from "../stack/stack.js";

const CAPACITY = 16;

/**
 * IStack compliance tests for the Stack data structure.
 *
 * These tests ensure that the Stack adheres to the IStack interface.
 */

suite.each<{
	description: string;
	factory: Callable<
		[iterator?: Iterable<number>, capacity?: number],
		IStack<number>
	>;
}>([
	{
		description: "Stack",
		factory: (iterator) => new Stack(iterator),
	},
	{
		description: "BoundedStack",
		factory: (iterator) => new BoundedStack(iterator, { capacity: CAPACITY }),
	},
	{
		description: "BlockingStack",
		factory: (iterator) => new BlockingStack(iterator, { capacity: CAPACITY }),
	},
])("$description IStack compliance", ({ factory }) => {
	test("should handle initial items correctly", () => {
		const stack: IStack<number> = factory([1, 2, 3]);

		expect(stack.count()).toBe(3);
		expect(stack.pop()).toBe(3);
		expect(stack.pop()).toBe(2);
		expect(stack.pop()).toBe(1);
		expect(stack.pop()).toBeUndefined();
		expect(stack.count()).toBe(0);
	});

	test("should push and pop elements in LIFO order", () => {
		const stack: IStack<number> = factory();
		expect(stack.count()).toBe(0);

		stack.push(1);
		stack.push(2);
		stack.push(3);
		expect(stack.count()).toBe(3);

		expect(stack.pop()).toBe(3);
		expect(stack.pop()).toBe(2);
		expect(stack.pop()).toBe(1);
		expect(stack.pop()).toBeUndefined();
		expect(stack.count()).toBe(0);
	});

	test("should return the top element without removing test", () => {
		const stack: IStack<number> = factory();
		stack.push(1);
		stack.push(2);

		expect(stack.top()).toBe(2);
		expect(stack.count()).toBe(2);

		stack.pop();
		expect(stack.top()).toBe(1);
		expect(stack.count()).toBe(1);

		stack.pop();
		expect(stack.top()).toBeUndefined();
		expect(stack.count()).toBe(0);
	});

	test("should pushAll so that the last element pops first", () => {
		const stack: IStack<number> = factory();

		stack.pushAll([1, 2, 3]);

		expect(stack.count()).toBe(3);
		expect(stack.pop()).toBe(3);
		expect(stack.pop()).toBe(2);
		expect(stack.pop()).toBe(1);
	});

	test("should pushAll a single-element array identically to push", () => {
		const stack: IStack<number> = factory();

		stack.push(1);
		stack.pushAll([2]);

		expect(stack.pop()).toBe(2);
		expect(stack.pop()).toBe(1);
	});

	test("should leave the stack untouched on an empty pushAll", () => {
		const stack: IStack<number> = factory([1]);

		stack.pushAll([]);

		expect(stack.count()).toBe(1);
		expect(stack.top()).toBe(1);
	});
});
