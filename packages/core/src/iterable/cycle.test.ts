import { describe, expect, it } from "vitest";

import { cycle } from "./cycle.js";
import { take } from "./take.js";

describe("cycle", () => {
	it("should repeat the sequence the requested number of times", () => {
		expect([...cycle([1, 2], 3)]).toEqual([1, 2, 1, 2, 1, 2]);
	});

	it("should yield one pass at a count of one", () => {
		expect([...cycle([1, 2], 1)]).toEqual([1, 2]);
	});

	it("should yield nothing at a count of zero", () => {
		expect([...cycle([1, 2], 0)]).toEqual([]);
	});

	it("should yield nothing for an empty iterable", () => {
		expect([...cycle([], 5)]).toEqual([]);
	});

	it("should repeat forever by default", () => {
		expect([...take(cycle([1, 2]), 5)]).toEqual([1, 2, 1, 2, 1]);
	});

	it("should repeat the whole sequence, not each element", () => {
		expect([...cycle([1, 2], 2)]).toEqual([1, 2, 1, 2]);
	});

	it("should consume a one-shot source only once", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			for (let value = 1; value <= 2; value++) {
				produced++;
				yield value;
			}
		}

		expect([...cycle(counted(), 3)]).toEqual([1, 2, 1, 2, 1, 2]);
		expect(produced).toBe(2);
	});

	it("should not buffer before the first pass is consumed", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		cycle(counted(), 2).next();

		expect(produced).toBe(1);
	});

	it("should reject a negative or fractional count", () => {
		expect(() => [...cycle([1], -1)]).toThrow(RangeError);
		expect(() => [...cycle([1], 1.5)]).toThrow(RangeError);
		expect(() => [...cycle([1], Number.NaN)]).toThrow(RangeError);
	});
});
