import { describe, expect, it } from "vitest";

import { includes } from "./includes.js";

describe("includes", () => {
	it("should return true when the item is present", () => {
		expect(includes([1, 2, 3], 2)).toBe(true);
	});

	it("should return false when the item is absent", () => {
		expect(includes([1, 2, 3], 4)).toBe(false);
	});

	it("should return false for an empty iterable", () => {
		expect(includes([], 1)).toBe(false);
	});

	it("should default to sameValueZero, treating NaN as equal to NaN", () => {
		expect(includes([Number.NaN], Number.NaN)).toBe(true);
	});

	it("should agree with Array.prototype.includes", () => {
		const values = [1, 2, Number.NaN];

		for (const candidate of [1, 4, Number.NaN]) {
			expect(includes(values, candidate)).toBe(values.includes(candidate));
		}
	});

	it("should use a custom equality strategy when provided", () => {
		const items = [{ id: 1 }, { id: 2 }];

		expect(includes(items, { id: 2 }, (a, b) => a.id === b.id)).toBe(true);
	});

	it("should accept non-array iterables", () => {
		expect(includes(new Set([1, 2, 3]), 3)).toBe(true);
	});

	it("should short-circuit on the first match", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		expect(includes(counted(), 2)).toBe(true);
		expect(produced).toBe(2);
	});
});
