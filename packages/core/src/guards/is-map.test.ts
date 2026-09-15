import { expect, suite, test } from "vitest";

import { isMap } from "./is-map.js";

suite("isMap", () => {
	test("should accept maps", () => {
		expect(isMap(new Map())).toBe(true);
		expect(isMap(new Map([["a", 1]]))).toBe(true);
	});

	test("should accept map subclasses", () => {
		class CountingMap extends Map<string, number> {}
		expect(isMap(new CountingMap())).toBe(true);
	});

	test("should reject other values", () => {
		expect(isMap(new WeakMap())).toBe(false);
		expect(isMap(new Set())).toBe(false);
		expect(isMap({})).toBe(false);
		expect(isMap([])).toBe(false);
		expect(isMap(null)).toBe(false);
		expect(isMap(undefined)).toBe(false);
	});
});
