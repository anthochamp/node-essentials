import { describe, expect, it } from "vitest";

import { dotPrecise } from "./dot-precise.js";

describe("dotPrecise", () => {
	it("recovers a dot product the naive loop destroys", () => {
		// Both products round to 2**54 + 2**28; the true dot product is 1.
		const a = [2 ** 27 + 1, -(2 ** 27)];
		const b = [2 ** 27 + 1, 2 ** 27 + 2];

		expect(a[0]! * b[0]! + a[1]! * b[1]!).toBe(0);
		expect(dotPrecise(a, b)).toBe(1);
	});

	it("survives cancellation across three terms", () => {
		const a = [1e17, 1, -1e17];
		const b = [1, 1, 1];

		expect(dotPrecise(a, b)).toBe(1);
	});

	it("matches the naive loop when nothing cancels", () => {
		expect(dotPrecise([1, 2, 3], [4, 5, 6])).toBe(32);
		expect(dotPrecise([0.5, 0.25], [0.5, 0.5])).toBe(0.375);
	});

	it("answers zero for empty inputs", () => {
		expect(dotPrecise([], [])).toBe(0);
	});

	it("handles a single term", () => {
		expect(dotPrecise([7], [6])).toBe(42);
	});

	it("rejects mismatched lengths", () => {
		expect(() => dotPrecise([1, 2], [1])).toThrow(RangeError);
	});

	it("propagates a non-finite term", () => {
		expect(dotPrecise([Number.POSITIVE_INFINITY, 1], [1, 1])).toBe(
			Number.POSITIVE_INFINITY,
		);
		expect(dotPrecise([Number.NaN, 1], [1, 1])).toBeNaN();
	});
});
