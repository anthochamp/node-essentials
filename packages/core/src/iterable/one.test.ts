import { describe, expect, it } from "vitest";

import { one } from "./one.js";

describe("one", () => {
	it("should return the single element", () => {
		expect(one([42])).toBe(42);
	});

	it("should return undefined for an empty iterable", () => {
		expect(one([])).toBeUndefined();
	});

	it("should throw for more than one element", () => {
		expect(() => one([1, 2])).toThrow(RangeError);
	});

	it("should accept non-array iterables", () => {
		expect(one(new Set(["a"]))).toBe("a");
	});

	it("should return a null element rather than treating it as absent", () => {
		expect(one([null])).toBeNull();
	});

	it("should pull at most two elements from an infinite iterable", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		expect(() => one(counted())).toThrow(RangeError);
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

		expect(() => one(closable())).toThrow(RangeError);
		expect(returned).toBe(true);
	});
});
