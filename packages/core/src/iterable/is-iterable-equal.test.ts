import { describe, expect, it } from "vitest";

import { isIterableEqual } from "./is-iterable-equal.js";

describe("isIterableEqual", () => {
	it("should return true for equal arrays", () => {
		expect(isIterableEqual([1, 2, 3], [1, 2, 3])).toBe(true);
	});

	it("should return false when an element differs", () => {
		expect(isIterableEqual([1, 2, 3], [1, 9, 3])).toBe(false);
	});

	it("should return false when the lengths differ", () => {
		expect(isIterableEqual([1, 2], [1, 2, 3])).toBe(false);
		expect(isIterableEqual([1, 2, 3], [1, 2])).toBe(false);
	});

	it("should return true for two empty iterables", () => {
		expect(isIterableEqual([], [])).toBe(true);
	});

	it("should be order-sensitive", () => {
		expect(isIterableEqual([1, 2], [2, 1])).toBe(false);
	});

	it("should compare across iterable kinds", () => {
		expect(isIterableEqual([1, 2, 3], new Set([1, 2, 3]))).toBe(true);
	});

	it("should default to strict equality", () => {
		expect(isIterableEqual([Number.NaN], [Number.NaN])).toBe(false);
		expect(isIterableEqual([{ id: 1 }], [{ id: 1 }])).toBe(false);
	});

	it("should honour a well-known comparison strategy", () => {
		expect(isIterableEqual([Number.NaN], [Number.NaN], "sameValueZero")).toBe(
			true,
		);
	});

	it("should honour a custom comparator", () => {
		expect(
			isIterableEqual([{ id: 1 }], [{ id: 1 }], (a, b) => a.id === b.id),
		).toBe(true);
	});

	it("should short-circuit on the first difference", () => {
		let compared = 0;
		isIterableEqual([1, 2, 3], [9, 2, 3], (a, b) => {
			compared++;
			return a === b;
		});

		expect(compared).toBe(1);
	});

	it("should not drain past the first difference", () => {
		let produced = 0;
		function* counted(start: number): IterableIterator<number> {
			let value = start;
			while (true) {
				produced++;
				yield value++;
			}
		}

		expect(isIterableEqual(counted(0), counted(100))).toBe(false);
		expect(produced).toBe(2);
	});

	it("should close whichever iterator has not ended", () => {
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

		expect(isIterableEqual(closable(1), closable(5))).toBe(false);
		expect(returned).toBe(2);
	});

	it("should agree with an element-wise comparison over arrays", () => {
		const cases: [number[], number[]][] = [
			[[], []],
			[[1], [1]],
			[[1], [2]],
			[[1, 2], [1]],
			[
				[1, 2, 3],
				[1, 2, 3],
			],
		];

		for (const [a, b] of cases) {
			const expected =
				a.length === b.length && a.every((value, index) => value === b[index]);

			expect(isIterableEqual(a, b)).toBe(expected);
		}
	});
});
