import { describe, expect, it } from "vitest";

import { isDisjointFrom } from "./is-disjoint-from.js";

describe("isDisjointFrom", () => {
	it("should return true when a and b share no elements", () => {
		expect(isDisjointFrom([1, 2], [3, 4])).toBe(true);
	});

	it("should return false when a and b share an element", () => {
		expect(isDisjointFrom([1, 2], [2, 3])).toBe(false);
	});

	it("should return true for two empty iterables", () => {
		expect(isDisjointFrom([], [])).toBe(true);
	});
});
