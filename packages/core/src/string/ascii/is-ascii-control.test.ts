import { describe, expect, it } from "vitest";

import { isAsciiControl } from "./is-ascii-control.js";

describe("isAsciiControl", () => {
	it("should be true across the C0 range", () => {
		expect(isAsciiControl(0x00)).toBe(true);
		expect(isAsciiControl("\n".charCodeAt(0))).toBe(true);
		expect(isAsciiControl(0x1f)).toBe(true);
	});

	it("should be true for DEL", () => {
		expect(isAsciiControl(0x7f)).toBe(true);
	});

	it("should be false for a space, which is printable", () => {
		expect(isAsciiControl(" ".charCodeAt(0))).toBe(false);
	});

	it("should be false for a letter", () => {
		expect(isAsciiControl("a".charCodeAt(0))).toBe(false);
	});

	it("should be false outside ASCII", () => {
		expect(isAsciiControl(0x80)).toBe(false);
		expect(isAsciiControl(0x9f)).toBe(false);
	});
});
