import { describe, expect, it } from "vitest";

import { parseNumberOrBigInt } from "./parse-number-or-big-int.js";

describe("parseNumberOrBigInt", () => {
	it("should read an integer the safe range holds as a number", () => {
		expect(parseNumberOrBigInt("42")).toBe(42);
		expect(parseNumberOrBigInt("-42")).toBe(-42);
		expect(parseNumberOrBigInt("+42")).toBe(42);
		expect(parseNumberOrBigInt("0")).toBe(0);
		expect(parseNumberOrBigInt("9007199254740991")).toBe(9007199254740991);
	});

	it("should widen an integer past the safe range to a bigint", () => {
		expect(parseNumberOrBigInt("9007199254740992")).toBe(9007199254740992n);
		expect(parseNumberOrBigInt("-9007199254740992")).toBe(-9007199254740992n);
		expect(parseNumberOrBigInt("123456789012345678901234567890")).toBe(
			123456789012345678901234567890n,
		);
	});

	it("should read a non-integer literal as a number", () => {
		expect(parseNumberOrBigInt("1.5")).toBe(1.5);
		expect(parseNumberOrBigInt("1.5e3")).toBe(1500);
		expect(parseNumberOrBigInt("-0.25")).toBe(-0.25);
		expect(parseNumberOrBigInt("Infinity")).toBe(Infinity);
		expect(parseNumberOrBigInt("-Infinity")).toBe(-Infinity);
	});

	it("should read the radix prefixes BigInt accepts", () => {
		expect(parseNumberOrBigInt("0x10")).toBe(16);
		expect(parseNumberOrBigInt("0o10")).toBe(8);
		expect(parseNumberOrBigInt("0b101")).toBe(5);
	});

	it("should ignore surrounding whitespace", () => {
		expect(parseNumberOrBigInt("  12  ")).toBe(12);
		expect(parseNumberOrBigInt("\t1.5\n")).toBe(1.5);
	});

	it("should answer null for blank text rather than zero", () => {
		expect(parseNumberOrBigInt("")).toBeNull();
		expect(parseNumberOrBigInt("   ")).toBeNull();
	});

	it("should answer null for text that spells no number", () => {
		expect(parseNumberOrBigInt("abc")).toBeNull();
		expect(parseNumberOrBigInt("NaN")).toBeNull();
		expect(parseNumberOrBigInt("12abc")).toBeNull();
		expect(parseNumberOrBigInt("1,5")).toBeNull();
	});

	it("should never round an integer it returns", () => {
		const text = "9007199254740993";
		const parsed = parseNumberOrBigInt(text);

		expect(typeof parsed).toBe("bigint");
		expect(String(parsed)).toBe(text);
	});
});
