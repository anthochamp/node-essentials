import { describe, expect, it } from "vitest";

import { alwaysIterable } from "./always-iterable.js";

describe("alwaysIterable", () => {
	it("should wrap a single item", () => {
		expect([...alwaysIterable(1)]).toEqual([1]);
	});

	it("should pass an array through", () => {
		expect([...alwaysIterable([1, 2])]).toEqual([1, 2]);
	});

	it("should treat a string as one item, not a sequence of characters", () => {
		expect([...alwaysIterable("abc")]).toEqual(["abc"]);
	});

	it("should treat an array of strings as many items", () => {
		expect([...alwaysIterable(["ab", "cd"])]).toEqual(["ab", "cd"]);
	});

	it("should wrap null and undefined rather than dropping them", () => {
		expect([...alwaysIterable(null)]).toEqual([null]);
		expect([...alwaysIterable(undefined)]).toEqual([undefined]);
	});

	it("should pass a Set through", () => {
		expect([...alwaysIterable(new Set([1, 2]))]).toEqual([1, 2]);
	});

	it("should wrap a plain object", () => {
		const value = { id: 1 };

		expect([...alwaysIterable(value)]).toEqual([value]);
	});

	it("should return an iterable source as-is rather than copying", () => {
		const values = [1, 2];

		expect(alwaysIterable(values)).toBe(values);
	});

	it("should leave a one-shot source one-shot", () => {
		function* generated(): IterableIterator<number> {
			yield 1;
		}

		const iterator = generated();

		expect(alwaysIterable(iterator)).toBe(iterator);
	});
});
