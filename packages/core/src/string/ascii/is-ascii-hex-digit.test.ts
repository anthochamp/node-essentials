import { describe, expect, it } from "vitest";

import { isAsciiHexDigit } from "./is-ascii-hex-digit.js";

describe("isAsciiHexDigit", () => {
	it("should be true for a decimal digit", () => {
		expect(isAsciiHexDigit("7".charCodeAt(0))).toBe(true);
	});

	it("should be true for an uppercase hex letter", () => {
		expect(isAsciiHexDigit("F".charCodeAt(0))).toBe(true);
	});

	it("should be true for a lowercase hex letter", () => {
		expect(isAsciiHexDigit("f".charCodeAt(0))).toBe(true);
	});

	it("should be false for a non-hex letter", () => {
		expect(isAsciiHexDigit("g".charCodeAt(0))).toBe(false);
		expect(isAsciiHexDigit("G".charCodeAt(0))).toBe(false);
	});
});
