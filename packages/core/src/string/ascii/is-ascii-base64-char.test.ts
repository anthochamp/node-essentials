import { describe, expect, it } from "vitest";

import { isAsciiBase64Char } from "./is-ascii-base64-char.js";

describe("isAsciiBase64Char", () => {
	it("should be true for a letter", () => {
		expect(isAsciiBase64Char("Q".charCodeAt(0))).toBe(true);
	});

	it("should be true for a digit", () => {
		expect(isAsciiBase64Char("7".charCodeAt(0))).toBe(true);
	});

	it("should be true for the base64 alphabet's '+' and '/'", () => {
		expect(isAsciiBase64Char("+".charCodeAt(0))).toBe(true);
		expect(isAsciiBase64Char("/".charCodeAt(0))).toBe(true);
	});

	it("should be true for the base64url alphabet's '-' and '_'", () => {
		expect(isAsciiBase64Char("-".charCodeAt(0))).toBe(true);
		expect(isAsciiBase64Char("_".charCodeAt(0))).toBe(true);
	});

	it("should be false for padding ('=')", () => {
		expect(isAsciiBase64Char("=".charCodeAt(0))).toBe(false);
	});

	it("should be false for unrelated punctuation", () => {
		expect(isAsciiBase64Char("!".charCodeAt(0))).toBe(false);
	});
});
