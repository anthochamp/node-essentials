import { expect, suite, test } from "vitest";

import { isWeakSet } from "./is-weak-set.js";

suite("isWeakSet", () => {
	test("should accept weak sets", () => {
		expect(isWeakSet(new WeakSet())).toBe(true);
	});

	test("should reject other values", () => {
		expect(isWeakSet(new Set())).toBe(false);
		expect(isWeakSet(new WeakMap())).toBe(false);
		expect(isWeakSet({})).toBe(false);
		expect(isWeakSet(null)).toBe(false);
		expect(isWeakSet(undefined)).toBe(false);
	});
});
