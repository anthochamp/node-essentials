import { expect, suite, test } from "vitest";
import { stringIsEqual } from "./string-is-equal.js";

suite("stringIsEqual", () => {
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

	test("should return true for equal strings with diacritics replaced", () => {
		expect(stringIsEqual("café", "cafe", { replaceDiacritics: true })).toBe(
			true,
		);
		expect(stringIsEqual("résumé", "resume", { replaceDiacritics: true })).toBe(
			true,
		);
		expect(stringIsEqual("naïve", "naive", { replaceDiacritics: true })).toBe(
			true,
		);
	});

	test("should combine caseInsensitive and replaceDiacritics", () => {
		expect(
			stringIsEqual("CAFÉ", "cafe", {
				caseInsensitive: true,
				replaceDiacritics: true,
			}),
		).toBe(true);
		expect(
			stringIsEqual("Résumé", "RESUME", {
				caseInsensitive: true,
				replaceDiacritics: true,
			}),
		).toBe(true);
		expect(
			stringIsEqual("Naïve", "NAIVE", {
				caseInsensitive: true,
				replaceDiacritics: true,
			}),
		).toBe(true);
	});
});
