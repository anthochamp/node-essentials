import { describe, expect, it } from "vitest";

import { isSubsetOf } from "./is-subset-of.js";

describe("isSubsetOf", () => {
	it("should return true when a is a subset of b", () => {
		expect(isSubsetOf([1, 2], [1, 2, 3])).toBe(true);
	});

	it("should return true when a equals b", () => {
		expect(isSubsetOf([1, 2], [1, 2])).toBe(true);
	});

	it("should return false when a has an element not in b", () => {
		expect(isSubsetOf([1, 4], [1, 2, 3])).toBe(false);
	});

	it("should return true for an empty a", () => {
		expect(isSubsetOf([], [1, 2])).toBe(true);
	});
});
