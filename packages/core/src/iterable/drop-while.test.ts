import { describe, expect, it } from "vitest";

import { dropWhile } from "./drop-while.js";

describe("dropWhile", () => {
	it("should skip the leading elements that satisfy the predicate", () => {
		expect([...dropWhile([1, 2, 3, 1], (value) => value < 3)]).toEqual([3, 1]);
	});

	it("should yield everything when the first element is rejected", () => {
		expect([...dropWhile([3, 1, 2], (value) => value < 3)]).toEqual([3, 1, 2]);
	});

	it("should yield nothing when the predicate always holds", () => {
		expect([...dropWhile([1, 2, 3], () => true)]).toEqual([]);
	});

	it("should stop consulting the predicate after the first rejection", () => {
		let calls = 0;
		const kept = [
			...dropWhile([1, 9, 2, 3], (value) => {
				calls++;
				return value < 5;
			}),
		];

		expect(calls).toBe(2);
		expect(kept).toEqual([9, 2, 3]);
	});

	it("should be the complement of takeWhile", () => {
		const values = [1, 2, 3, 1, 2];
		const predicate = (value: number): boolean => value < 3;

		expect([...dropWhile(values, predicate)]).toEqual(values.slice(2));
	});

	it("should pass the zero-based index to the predicate", () => {
		expect([
			...dropWhile(["a", "b", "c"], (_value, index) => index < 1),
		]).toEqual(["b", "c"]);
	});

	it("should accept non-array iterables", () => {
		expect([...dropWhile(new Set([1, 2, 3]), (value) => value < 2)]).toEqual([
			2, 3,
		]);
	});
});
