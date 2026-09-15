import { describe, expect, it } from "vitest";

import { isAsciiLowerAlpha } from "./is-ascii-lower-alpha.js";

describe("isAsciiLowerAlpha", () => {
	it("should be true for 'a'-'z'", () => {
		for (let code = "a".charCodeAt(0); code <= "z".charCodeAt(0); code++) {
			expect(isAsciiLowerAlpha(code)).toBe(true);
		}
	});

	it("should be false for an uppercase letter", () => {
		expect(isAsciiLowerAlpha("A".charCodeAt(0))).toBe(false);
	});

	it("should be false for a digit", () => {
		expect(isAsciiLowerAlpha("5".charCodeAt(0))).toBe(false);
	});
});
