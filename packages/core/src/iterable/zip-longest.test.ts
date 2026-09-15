import { describe, expect, it } from "vitest";

import { zipLongest } from "./zip-longest.js";

describe("zipLongest", () => {
	it("should continue to the longest iterable, filling the rest", () => {
		expect([...zipLongest([[1, 2, 3], [10]], null)]).toEqual([
			[1, 10],
			[2, null],
			[3, null],
		]);
	});

	it("should behave like zip when every iterable is the same length", () => {
		expect([...zipLongest([[1, 2], "ab"], null)]).toEqual([
			[1, "a"],
			[2, "b"],
		]);
	});

	it("should fill from whichever iterable ends first", () => {
		expect([...zipLongest([[1], [10, 20], [100]], 0)]).toEqual([
			[1, 10, 100],
			[0, 20, 0],
		]);
	});

	it("should yield nothing when given no iterables", () => {
		expect([...zipLongest([], null)]).toEqual([]);
	});

	it("should yield nothing when every iterable is empty", () => {
		expect([...zipLongest([[], []], null)]).toEqual([]);
	});

	it("should treat an empty iterable as filled from the start", () => {
		expect([...zipLongest([[], [1, 2]], "x")]).toEqual([
			["x", 1],
			["x", 2],
		]);
	});

	it("should close every source iterator when iteration ends", () => {
		let returned = 0;
		function* closable(length: number): IterableIterator<number> {
			try {
				for (let index = 0; index < length; index++) {
					yield index;
				}
			} finally {
				returned++;
			}
		}

		expect([...zipLongest([closable(1), closable(2)], -1)]).toEqual([
			[0, 0],
			[-1, 1],
		]);
		expect(returned).toBe(2);
	});
});
