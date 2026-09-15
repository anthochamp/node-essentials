import { expect, suite, test } from "vitest";

import { isRegExp } from "./is-regexp.js";

suite("isRegExp", () => {
	test("should accept regular expressions", () => {
		expect(isRegExp(/a/)).toBe(true);
		expect(isRegExp(new RegExp("a", "gu"))).toBe(true);
	});

	test("should reject other values", () => {
		expect(isRegExp("/a/")).toBe(false);
		expect(isRegExp({ source: "a", flags: "g" })).toBe(false);
		expect(isRegExp(null)).toBe(false);
		expect(isRegExp(undefined)).toBe(false);
	});
});
