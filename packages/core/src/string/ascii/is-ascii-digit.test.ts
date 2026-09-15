import { describe, expect, it } from "vitest";

import { isAsciiDigit } from "./is-ascii-digit.js";

describe("isAsciiDigit", () => {
	it("should be true for '0'-'9'", () => {
		for (let code = "0".charCodeAt(0); code <= "9".charCodeAt(0); code++) {
			expect(isAsciiDigit(code)).toBe(true);
		}
	});

	it("should be false for a letter", () => {
		expect(isAsciiDigit("a".charCodeAt(0))).toBe(false);
	});

	it("should be false for the code just below '0' and just above '9'", () => {
		expect(isAsciiDigit("0".charCodeAt(0) - 1)).toBe(false);
		expect(isAsciiDigit("9".charCodeAt(0) + 1)).toBe(false);
	});
});
