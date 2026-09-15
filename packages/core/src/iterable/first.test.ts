import { describe, expect, it } from "vitest";

import { first } from "./first.js";

describe("first", () => {
	it("should return the first element", () => {
		expect(first([1, 2, 3])).toBe(1);
	});

	it("should return undefined for an empty iterable", () => {
		expect(first([])).toBeUndefined();
	});

	it("should accept non-array iterables", () => {
		expect(first(new Set(["a", "b"]))).toBe("a");
	});

	it("should return a null element rather than treating it as absent", () => {
		expect(first([null, 1])).toBeNull();
	});

	it("should pull exactly one element", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		expect(first(counted())).toBe(1);
		expect(produced).toBe(1);
	});

	it("should close the iterator without draining it", () => {
		let returned = false;
		function* closable(): IterableIterator<number> {
			try {
				yield 1;
				yield 2;
			} finally {
				returned = true;
			}
		}

		first(closable());

		expect(returned).toBe(true);
	});
});
