import { describe, expect, it } from "vitest";

import { pad } from "./pad.js";

describe("pad", () => {
	it("should pad up to the requested length", () => {
		expect([...pad([1, 2], 4, 0)]).toEqual([1, 2, 0, 0]);
	});

	it("should leave an input already at the length unchanged", () => {
		expect([...pad([1, 2], 2, 0)]).toEqual([1, 2]);
	});

	it("should never truncate a longer input", () => {
		expect([...pad([1, 2, 3], 2, 0)]).toEqual([1, 2, 3]);
	});

	it("should produce only padding for an empty iterable", () => {
		expect([...pad([], 3, "x")]).toEqual(["x", "x", "x"]);
	});

	it("should yield nothing at a length of zero", () => {
		expect([...pad([], 0, "x")]).toEqual([]);
	});

	it("should accept a fill of a different type", () => {
		expect([...pad([1], 3, null)]).toEqual([1, null, null]);
	});

	it("should reject a negative or fractional length", () => {
		expect(() => [...pad([1], -1, 0)]).toThrow(RangeError);
		expect(() => [...pad([1], 1.5, 0)]).toThrow(RangeError);
	});
});
