import { describe, expect, it } from "vitest";

import { isAsciiAlphaNumeric } from "./is-ascii-alpha-numeric.js";

describe("isAsciiAlphaNumeric", () => {
	it("should be true for a letter", () => {
		expect(isAsciiAlphaNumeric("Q".charCodeAt(0))).toBe(true);
	});

	it("should be true for a digit", () => {
		expect(isAsciiAlphaNumeric("7".charCodeAt(0))).toBe(true);
	});

	it("should be false for punctuation", () => {
		expect(isAsciiAlphaNumeric("_".charCodeAt(0))).toBe(false);
	});
});
