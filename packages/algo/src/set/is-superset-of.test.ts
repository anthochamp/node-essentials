import { describe, expect, it } from "vitest";

import { isSupersetOf } from "./is-superset-of.js";

describe("isSupersetOf", () => {
	it("should return true when a is a superset of b", () => {
		expect(isSupersetOf([1, 2, 3], [1, 2])).toBe(true);
	});

	it("should return true when a equals b", () => {
		expect(isSupersetOf([1, 2], [1, 2])).toBe(true);
	});

	it("should return false when b has an element not in a", () => {
		expect(isSupersetOf([1, 2, 3], [1, 4])).toBe(false);
	});

	it("should return true for an empty b", () => {
		expect(isSupersetOf([1, 2], [])).toBe(true);
	});
});
