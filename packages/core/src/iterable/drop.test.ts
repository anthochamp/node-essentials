import { describe, expect, it } from "vitest";

import { drop } from "./drop.js";

describe("drop", () => {
	it("should skip the leading elements", () => {
		expect([...drop([1, 2, 3, 4], 2)]).toEqual([3, 4]);
	});

	it("should yield nothing when the count exceeds the length", () => {
		expect([...drop([1, 2], 5)]).toEqual([]);
	});

	it("should yield everything at a count of zero", () => {
		expect([...drop([1, 2, 3], 0)]).toEqual([1, 2, 3]);
	});

	it("should agree with Array.prototype.slice", () => {
		const values = [1, 2, 3, 4, 5];

		expect([...drop(values, 2)]).toEqual(values.slice(2));
	});

	it("should accept non-array iterables", () => {
		expect([...drop(new Set(["a", "b", "c"]), 1)]).toEqual(["b", "c"]);
	});

	it("should be lazy — it yields the first kept element without draining", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		const iterator = drop(counted(), 2);

		expect(iterator.next().value).toBe(3);
		expect(produced).toBe(3);
	});

	it("should reject a negative or fractional count", () => {
		expect(() => [...drop([1], -1)]).toThrow(RangeError);
		expect(() => [...drop([1], 1.5)]).toThrow(RangeError);
	});
});
