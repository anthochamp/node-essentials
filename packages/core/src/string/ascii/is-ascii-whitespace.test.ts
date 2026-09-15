import { describe, expect, it } from "vitest";

import { isAsciiWhitespace } from "./is-ascii-whitespace.js";

describe("isAsciiWhitespace", () => {
	it("should be true for space, tab, LF, and CR", () => {
		expect(isAsciiWhitespace(" ".charCodeAt(0))).toBe(true);
		expect(isAsciiWhitespace("\t".charCodeAt(0))).toBe(true);
		expect(isAsciiWhitespace("\n".charCodeAt(0))).toBe(true);
		expect(isAsciiWhitespace("\r".charCodeAt(0))).toBe(true);
	});

	it("should be true for VT and FF", () => {
		expect(isAsciiWhitespace(0x0b)).toBe(true);
		expect(isAsciiWhitespace(0x0c)).toBe(true);
	});

	it("should be false for a letter", () => {
		expect(isAsciiWhitespace("a".charCodeAt(0))).toBe(false);
	});
});
