import { describe, expect, it } from "vitest";

import { only } from "./only.js";

describe("only", () => {
	it("should return the single element", () => {
		expect(only([42])).toBe(42);
	});

	it("should throw for an empty iterable", () => {
		expect(() => only([])).toThrow(RangeError);
	});

	it("should throw for more than one element", () => {
		expect(() => only([1, 2])).toThrow(RangeError);
	});

	it("should accept non-array iterables", () => {
		expect(only(new Set(["a"]))).toBe("a");
	});

	it("should return an undefined element rather than rejecting it", () => {
		expect(only([undefined])).toBeUndefined();
	});

	it("should pull at most two elements from an infinite iterable", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		expect(() => only(counted())).toThrow(RangeError);
		expect(produced).toBe(2);
	});

	it("should close the iterator when it rejects", () => {
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

		expect(() => only(closable())).toThrow(RangeError);
		expect(returned).toBe(true);
	});
});
