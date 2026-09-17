import { describe, expect, it } from "vitest";

import { isAsciiBlank } from "./is-ascii-blank.js";

describe("isAsciiBlank", () => {
	it("should be true for a space and a horizontal tab", () => {
		expect(isAsciiBlank(" ".charCodeAt(0))).toBe(true);
		expect(isAsciiBlank("\t".charCodeAt(0))).toBe(true);
	});

	it("should be false for the line terminators isAsciiWhitespace accepts", () => {
		expect(isAsciiBlank("\n".charCodeAt(0))).toBe(false);
		expect(isAsciiBlank("\r".charCodeAt(0))).toBe(false);
		expect(isAsciiBlank(0x0b)).toBe(false);
		expect(isAsciiBlank(0x0c)).toBe(false);
	});

	it("should be false for a letter", () => {
		expect(isAsciiBlank("a".charCodeAt(0))).toBe(false);
	});
});
