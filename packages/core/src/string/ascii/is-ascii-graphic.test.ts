import { describe, expect, it } from "vitest";

import { isAsciiGraphic } from "./is-ascii-graphic.js";

describe("isAsciiGraphic", () => {
	it("should be true from ! through ~", () => {
		expect(isAsciiGraphic("!".charCodeAt(0))).toBe(true);
		expect(isAsciiGraphic("A".charCodeAt(0))).toBe(true);
		expect(isAsciiGraphic("7".charCodeAt(0))).toBe(true);
		expect(isAsciiGraphic("~".charCodeAt(0))).toBe(true);
	});

	it("should be false for the space", () => {
		expect(isAsciiGraphic(" ".charCodeAt(0))).toBe(false);
	});

	it("should be false for a control character", () => {
		expect(isAsciiGraphic("\t".charCodeAt(0))).toBe(false);
		expect(isAsciiGraphic(0x7f)).toBe(false);
	});

	it("should be false outside ASCII", () => {
		expect(isAsciiGraphic(0xa0)).toBe(false);
	});
});
