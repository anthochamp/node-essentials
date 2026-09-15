import { describe, expect, it } from "vitest";

import { bigIntParse } from "./parse.js";

describe("bigIntParse", () => {
	it("reads decimal by default", () => {
		expect(bigIntParse("123")).toBe(123n);
		expect(bigIntParse("-123")).toBe(-123n);
		expect(bigIntParse("+123")).toBe(123n);
		expect(bigIntParse("  42  ")).toBe(42n);
	});

	it("reads every radix parseInt accepts", () => {
		for (let radix = 2; radix <= 36; radix++) {
			expect(bigIntParse((radix * radix).toString(radix), radix)).toBe(
				BigInt(radix * radix),
			);
		}

		expect(bigIntParse("ff", 16)).toBe(255n);
		expect(bigIntParse("FF", 16)).toBe(255n);
		expect(bigIntParse("zz", 36)).toBe(1295n);
		expect(bigIntParse("777", 8)).toBe(511n);
		expect(bigIntParse("-1010", 2)).toBe(-10n);
	});

	it("round-trips values far past the safe-integer range", () => {
		const value = 2n ** 600n + 12345n;

		for (const radix of [2, 3, 7, 10, 16, 36]) {
			expect(bigIntParse(value.toString(radix), radix)).toBe(value);
			expect(bigIntParse((-value).toString(radix), radix)).toBe(-value);
		}
	});

	it("takes a prefix as the radix when none is given", () => {
		expect(bigIntParse("0xff")).toBe(255n);
		expect(bigIntParse("0XFF")).toBe(255n);
		expect(bigIntParse("0o17")).toBe(15n);
		expect(bigIntParse("0b1010")).toBe(10n);
		expect(bigIntParse("-0xff")).toBe(-255n);
	});

	it("accepts a prefix that agrees with the radix", () => {
		expect(bigIntParse("0xff", 16)).toBe(255n);
	});

	it("rejects a prefix that contradicts the radix", () => {
		expect(() => bigIntParse("0xff", 8)).toThrow(RangeError);
	});

	it("rejects a radix outside [2, 36]", () => {
		expect(() => bigIntParse("1", 1)).toThrow(RangeError);
		expect(() => bigIntParse("1", 37)).toThrow(RangeError);
		expect(() => bigIntParse("1", 10.5)).toThrow(RangeError);
	});

	it("rejects trailing junk rather than truncating like parseInt", () => {
		expect(Number.parseInt("12abc", 10)).toBe(12);
		expect(() => bigIntParse("12abc")).toThrow(SyntaxError);
		expect(() => bigIntParse("12 34")).toThrow(SyntaxError);
		expect(() => bigIntParse("1.5")).toThrow(SyntaxError);
	});

	it("rejects a digit the radix does not define", () => {
		expect(() => bigIntParse("2", 2)).toThrow(SyntaxError);
		expect(() => bigIntParse("8", 8)).toThrow(SyntaxError);
		expect(() => bigIntParse("g", 16)).toThrow(SyntaxError);
	});

	it("rejects an empty run of digits", () => {
		expect(() => bigIntParse("")).toThrow(SyntaxError);
		expect(() => bigIntParse("   ")).toThrow(SyntaxError);
		expect(() => bigIntParse("-")).toThrow(SyntaxError);
		expect(() => bigIntParse("0x")).toThrow(SyntaxError);
	});

	it("reads zero in every form", () => {
		expect(bigIntParse("0")).toBe(0n);
		expect(bigIntParse("-0")).toBe(0n);
		expect(bigIntParse("0000", 2)).toBe(0n);
	});
});
