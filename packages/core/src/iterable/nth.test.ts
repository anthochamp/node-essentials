import { describe, expect, it } from "vitest";

import { nth } from "./nth.js";

describe("nth", () => {
	it("should return the element at the given index", () => {
		expect(nth([1, 2, 3], 1)).toBe(2);
	});

	it("should return the first element at index 0", () => {
		expect(nth([1, 2, 3], 0)).toBe(1);
	});

	it("should return undefined past the end", () => {
		expect(nth([1, 2, 3], 3)).toBeUndefined();
		expect(nth([], 0)).toBeUndefined();
	});

	it("should accept non-array iterables", () => {
		expect(nth(new Set(["a", "b", "c"]), 2)).toBe("c");
	});

	it("should pull only as far as the index", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		expect(nth(counted(), 2)).toBe(3);
		expect(produced).toBe(3);
	});

	it("should close the iterator without draining it", () => {
		let returned = false;
		function* closable(): IterableIterator<number> {
			try {
				yield 1;
				yield 2;
				yield 3;
			} finally {
				returned = true;
			}
		}

		nth(closable(), 0);

		expect(returned).toBe(true);
	});

	it("should reject a negative or fractional index", () => {
		expect(() => nth([1], -1)).toThrow(RangeError);
		expect(() => nth([1], 1.5)).toThrow(RangeError);
		expect(() => nth([1], Number.NaN)).toThrow(RangeError);
	});
});
