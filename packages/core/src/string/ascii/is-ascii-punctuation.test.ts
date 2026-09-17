import { describe, expect, it } from "vitest";

import { isAsciiPunctuation } from "./is-ascii-punctuation.js";

describe("isAsciiPunctuation", () => {
	it("should be true across each of the four punctuation blocks", () => {
		for (const char of "!/:@[`{~") {
			expect(isAsciiPunctuation(char.charCodeAt(0))).toBe(true);
		}
	});

	it("should be false for letters and digits", () => {
		expect(isAsciiPunctuation("a".charCodeAt(0))).toBe(false);
		expect(isAsciiPunctuation("Z".charCodeAt(0))).toBe(false);
		expect(isAsciiPunctuation("7".charCodeAt(0))).toBe(false);
	});

	it("should be false for the space and for control characters", () => {
		expect(isAsciiPunctuation(" ".charCodeAt(0))).toBe(false);
		expect(isAsciiPunctuation("\t".charCodeAt(0))).toBe(false);
	});

	it("should hold exactly the 32 characters C names", () => {
		let count = 0;

		for (let code = 0; code <= 0xff; code++) {
			if (isAsciiPunctuation(code)) {
				count += 1;
			}
		}

		expect(count).toBe(32);
	});
});
