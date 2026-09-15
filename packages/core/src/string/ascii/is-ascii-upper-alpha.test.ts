import { describe, expect, it } from "vitest";

import { isAsciiUpperAlpha } from "./is-ascii-upper-alpha.js";

describe("isAsciiUpperAlpha", () => {
	it("should be true for 'A'-'Z'", () => {
		for (let code = "A".charCodeAt(0); code <= "Z".charCodeAt(0); code++) {
			expect(isAsciiUpperAlpha(code)).toBe(true);
		}
	});

	it("should be false for a lowercase letter", () => {
		expect(isAsciiUpperAlpha("a".charCodeAt(0))).toBe(false);
	});

	it("should be false for a digit", () => {
		expect(isAsciiUpperAlpha("5".charCodeAt(0))).toBe(false);
	});
});
