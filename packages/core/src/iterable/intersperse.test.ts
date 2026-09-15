import { describe, expect, it } from "vitest";

import { intersperse } from "./intersperse.js";

describe("intersperse", () => {
	it("should place the separator between elements", () => {
		expect([...intersperse([1, 2, 3], 0)]).toEqual([1, 0, 2, 0, 3]);
	});

	it("should not add a trailing separator", () => {
		expect([...intersperse([1, 2], "-")]).toEqual([1, "-", 2]);
	});

	it("should yield a single element alone", () => {
		expect([...intersperse([1], 0)]).toEqual([1]);
	});

	it("should yield nothing for an empty iterable", () => {
		expect([...intersperse([], 0)]).toEqual([]);
	});

	it("should agree with Array.prototype.join over strings", () => {
		const values = ["a", "b", "c"];

		expect([...intersperse(values, "-")].join("")).toBe(values.join("-"));
	});

	it("should accept a separator of a different type", () => {
		expect([...intersperse([1, 2], null)]).toEqual([1, null, 2]);
	});

	it("should be lazy", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		intersperse(counted(), 0).next();

		expect(produced).toBe(1);
	});
});
