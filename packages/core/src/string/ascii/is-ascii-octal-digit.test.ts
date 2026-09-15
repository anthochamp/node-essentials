import { describe, expect, it } from "vitest";

import { isAsciiOctalDigit } from "./is-ascii-octal-digit.js";

describe("isAsciiOctalDigit", () => {
	it("should accept every octal digit", () => {
		for (const digit of "01234567") {
			expect(isAsciiOctalDigit(digit.charCodeAt(0))).toBe(true);
		}
	});

	it("should reject the decimal digits outside the octal range", () => {
		expect(isAsciiOctalDigit("8".charCodeAt(0))).toBe(false);
		expect(isAsciiOctalDigit("9".charCodeAt(0))).toBe(false);
	});

	it("should reject a non-digit", () => {
		expect(isAsciiOctalDigit("a".charCodeAt(0))).toBe(false);
	});
});
