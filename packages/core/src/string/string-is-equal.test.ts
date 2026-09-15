import { expect, suite, test } from "vitest";

import { stringIsEqual } from "./string-is-equal.js";

suite("stringIsEqual", () => {
	test("should compare lengths after lowercasing, not before", () => {
		// U+0130 lowercases to two code units, so a length check taken first
		// rejects a pair that is equal once the case is folded.
		expect(stringIsEqual("\u0130", "i\u0307", { caseInsensitive: true })).toBe(
			true,
		);
	});

	test("should return true for equal strings (default options)", () => {
		expect(stringIsEqual("hello", "hello")).toBe(true);
		expect(stringIsEqual("Hello", "hello")).toBe(false);
		expect(stringIsEqual("HELLO", "hello")).toBe(false);
		expect(stringIsEqual("", "")).toBe(true);
	});

	test("should return true for equal strings (caseInsensitive)", () => {
		expect(stringIsEqual("hello", "hello", { caseInsensitive: true })).toBe(
			true,
		);
		expect(stringIsEqual("Hello", "hello", { caseInsensitive: true })).toBe(
			true,
		);
		expect(stringIsEqual("HELLO", "hello", { caseInsensitive: true })).toBe(
			true,
		);
		expect(stringIsEqual("", "", { caseInsensitive: true })).toBe(true);
	});

	test("should return false for non-equal strings", () => {
		expect(stringIsEqual("hello", "world")).toBe(false);
		expect(stringIsEqual("hello", "helloo")).toBe(false);
		expect(stringIsEqual("hello", "hell")).toBe(false);
		expect(stringIsEqual("hello", "")).toBe(false);
		expect(stringIsEqual("", "hello")).toBe(false);
	});

	test("should apply locale-specific case folding to both strings", () => {
		// Turkish: uppercase dotless "I" lowercases to dotless "ı", not "i".
		expect(
			stringIsEqual("I", "ı", { caseInsensitive: true, locale: "tr" }),
		).toBe(true);
		expect(
			stringIsEqual("ı", "I", { caseInsensitive: true, locale: "tr" }),
		).toBe(true);
		expect(
			stringIsEqual("I", "world", { caseInsensitive: true, locale: "tr" }),
		).toBe(false);
	});
});
