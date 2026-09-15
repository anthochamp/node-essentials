import { describe, expect, it } from "vitest";

import { tap } from "./tap.js";

describe("tap", () => {
	it("should yield the elements unchanged", () => {
		expect([...tap([1, 2, 3], () => {})]).toEqual([1, 2, 3]);
	});

	it("should run the side effect once per element", () => {
		const seen: number[] = [];
		const yielded = [...tap([1, 2, 3], (value) => seen.push(value))];

		expect(seen).toEqual([1, 2, 3]);
		expect(yielded).toEqual([1, 2, 3]);
	});

	it("should pass the zero-based index", () => {
		const seen: number[] = [];
		const yielded = [...tap(["a", "b"], (_value, index) => seen.push(index))];

		expect(seen).toEqual([0, 1]);
		expect(yielded).toEqual(["a", "b"]);
	});

	it("should ignore the callback's return value", () => {
		expect([...tap([1, 2], (value) => value * 100)]).toEqual([1, 2]);
	});

	it("should yield nothing for an empty iterable", () => {
		expect([...tap([], () => {})]).toEqual([]);
	});

	it("should not run the side effect until an element is pulled", () => {
		let calls = 0;
		const iterator = tap([1, 2, 3], () => {
			calls++;
		});

		expect(calls).toBe(0);

		iterator.next();

		expect(calls).toBe(1);
	});
});
