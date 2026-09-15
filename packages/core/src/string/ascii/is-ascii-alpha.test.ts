import { describe, expect, it } from "vitest";

import { isAsciiAlpha } from "./is-ascii-alpha.js";

describe("isAsciiAlpha", () => {
	it("should be true for an uppercase letter", () => {
		expect(isAsciiAlpha("A".charCodeAt(0))).toBe(true);
	});

	it("should be true for a lowercase letter", () => {
		expect(isAsciiAlpha("z".charCodeAt(0))).toBe(true);
	});

	it("should be false for a digit", () => {
		expect(isAsciiAlpha("5".charCodeAt(0))).toBe(false);
	});

	it("should be false for punctuation", () => {
		expect(isAsciiAlpha("-".charCodeAt(0))).toBe(false);
	});
});
