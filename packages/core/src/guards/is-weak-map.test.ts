import { expect, suite, test } from "vitest";

import { isWeakMap } from "./is-weak-map.js";

suite("isWeakMap", () => {
	test("should accept weak maps", () => {
		expect(isWeakMap(new WeakMap())).toBe(true);
	});

	test("should reject other values", () => {
		expect(isWeakMap(new Map())).toBe(false);
		expect(isWeakMap(new WeakSet())).toBe(false);
		expect(isWeakMap({})).toBe(false);
		expect(isWeakMap(null)).toBe(false);
		expect(isWeakMap(undefined)).toBe(false);
	});
});
