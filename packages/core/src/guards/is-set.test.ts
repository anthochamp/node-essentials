import { expect, suite, test } from "vitest";

import { isSet } from "./is-set.js";

suite("isSet", () => {
	test("should accept sets", () => {
		expect(isSet(new Set())).toBe(true);
		expect(isSet(new Set([1, 2]))).toBe(true);
	});

	test("should accept set subclasses", () => {
		class OrderedSet extends Set<number> {}
		expect(isSet(new OrderedSet())).toBe(true);
	});

	test("should reject other values", () => {
		expect(isSet(new WeakSet())).toBe(false);
		expect(isSet(new Map())).toBe(false);
		expect(isSet({})).toBe(false);
		expect(isSet([])).toBe(false);
		expect(isSet(null)).toBe(false);
		expect(isSet(undefined)).toBe(false);
	});
});
