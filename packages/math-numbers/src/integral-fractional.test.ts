import { describe, expect, it } from "vitest";

import {
	integralFractionalFracPrecision,
	integralFractionalFromNumber,
	integralFractionalFromString,
	integralFractionalIntegralPrecision,
	integralFractionalPrecision,
	integralFractionalToString,
} from "./integral-fractional.js";

describe("integralFractionalFromString", () => {
	it("splits a signed numeral at the point", () => {
		expect(integralFractionalFromString("-123.456")).toEqual({
			s: -1,
			i: 123n,
			f: 456n,
			fracDigits: 3,
		});
		expect(integralFractionalFromString("42")).toEqual({
			s: 1,
			i: 42n,
			f: 0n,
			fracDigits: 0,
		});
	});

	it("tells leading-zero fractions apart", () => {
		expect(integralFractionalFromString("0.7").fracDigits).toBe(1);
		expect(integralFractionalFromString("0.007").fracDigits).toBe(3);
		expect(integralFractionalFromString("0.7").f).toBe(
			integralFractionalFromString("0.007").f,
		);
	});

	it("preserves trailing zeros", () => {
		expect(integralFractionalFromString("1.50")).toEqual({
			s: 1,
			i: 1n,
			f: 50n,
			fracDigits: 2,
		});
	});

	it("applies an exponent by moving the point", () => {
		expect(integralFractionalFromString("1e-7")).toEqual({
			s: 1,
			i: 0n,
			f: 1n,
			fracDigits: 7,
		});
		expect(integralFractionalFromString("1.25e-3")).toEqual({
			s: 1,
			i: 0n,
			f: 125n,
			fracDigits: 5,
		});
		expect(integralFractionalFromString("1.5e3")).toEqual({
			s: 1,
			i: 1500n,
			f: 0n,
			fracDigits: 0,
		});
		expect(integralFractionalFromString("1e21").i).toBe(10n ** 21n);
	});

	it("accepts a point on either side of the digits", () => {
		expect(integralFractionalFromString(".5").i).toBe(0n);
		expect(integralFractionalFromString(".5").f).toBe(5n);
		expect(integralFractionalFromString("5.")).toEqual({
			s: 1,
			i: 5n,
			f: 0n,
			fracDigits: 0,
		});
	});

	it("rejects anything that is not a numeral", () => {
		for (const text of ["", " ", "NaN", "Infinity", "1.2.3", "0x10", "12abc"]) {
			expect(() => integralFractionalFromString(text)).toThrow(SyntaxError);
		}
	});

	it("round-trips through toString", () => {
		for (const text of ["-123.456", "0.007", "42", "1.50", "0", "-0.1"]) {
			expect(
				integralFractionalToString(integralFractionalFromString(text)),
			).toBe(text);
		}
	});
});

describe("integralFractionalFromNumber", () => {
	it("decomposes the shortest round-tripping form", () => {
		expect(integralFractionalFromNumber(-123.456).f).toBe(456n);
		expect(integralFractionalFromNumber(1e-7).fracDigits).toBe(7);
		expect(integralFractionalFromNumber(1e21).i).toBe(10n ** 21n);
	});

	it("rejects values with no decomposition", () => {
		expect(() => integralFractionalFromNumber(Number.NaN)).toThrow(RangeError);
		expect(() =>
			integralFractionalFromNumber(Number.POSITIVE_INFINITY),
		).toThrow(RangeError);
	});
});

describe("precision queries", () => {
	const of = integralFractionalFromString;

	it("counts integral digits", () => {
		expect(integralFractionalIntegralPrecision(of("123.4"))).toBe(3);
		expect(integralFractionalIntegralPrecision(of("0.4"))).toBe(1);
		expect(integralFractionalIntegralPrecision(of("1e21"))).toBe(22);
	});

	it("counts decimal places", () => {
		expect(integralFractionalFracPrecision(of("123.450"))).toBe(3);
		expect(integralFractionalFracPrecision(of("42"))).toBe(0);
		expect(integralFractionalFracPrecision(of("1e-7"))).toBe(7);
	});

	it("counts significant digits between the outermost non-zero ones", () => {
		expect(integralFractionalPrecision(of("123.45"))).toBe(5);
		expect(integralFractionalPrecision(of("0.007"))).toBe(1);
		expect(integralFractionalPrecision(of("100.0"))).toBe(1);
		expect(integralFractionalPrecision(of("1002"))).toBe(4);
		expect(integralFractionalPrecision(of("0"))).toBe(1);
		expect(integralFractionalPrecision(of("0.000"))).toBe(1);
	});
});
