import { expect, suite, test } from "vitest";

import { isDate } from "./is-date.js";

suite("isDate", () => {
	test("should accept dates", () => {
		expect(isDate(new Date())).toBe(true);
		expect(isDate(new Date(0))).toBe(true);
	});

	test("should accept an invalid date", () => {
		expect(isDate(new Date(Number.NaN))).toBe(true);
	});

	test("should reject other values", () => {
		expect(isDate(Date.now())).toBe(false);
		expect(isDate("2026-01-01")).toBe(false);
		expect(isDate({})).toBe(false);
		expect(isDate(null)).toBe(false);
		expect(isDate(undefined)).toBe(false);
	});
});
