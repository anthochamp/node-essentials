import { describe, expect, it } from "vitest";

import { isAsciiGraphic } from "./is-ascii-graphic.js";
import { isAsciiPrintable } from "./is-ascii-printable.js";

describe("isAsciiPrintable", () => {
	it("should be true from the space through ~", () => {
		expect(isAsciiPrintable(" ".charCodeAt(0))).toBe(true);
		expect(isAsciiPrintable("A".charCodeAt(0))).toBe(true);
		expect(isAsciiPrintable("~".charCodeAt(0))).toBe(true);
	});

	it("should be false for a control character", () => {
		expect(isAsciiPrintable("\n".charCodeAt(0))).toBe(false);
		expect(isAsciiPrintable(0x7f)).toBe(false);
	});

	it("should differ from isAsciiGraphic on the space alone", () => {
		for (let code = 0; code <= 0xff; code++) {
			const expected = code === " ".charCodeAt(0) ? true : isAsciiGraphic(code);

			expect(isAsciiPrintable(code)).toBe(expected);
		}
	});
});
