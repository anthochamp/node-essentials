import { describe, expect, it } from "vitest";

import { round } from "./round.js";

describe("round", () => {
	describe("fractionDigits", () => {
		it("should round to whole numbers by default", () => {
			expect(round(1.5)).toBe(2);
			expect(round(1.4)).toBe(1);
			expect(round(-1.5)).toBe(-1);
		});

		it("should keep the requested digits after the decimal point", () => {
			expect(round(1.234_56, { fractionDigits: 2 })).toBe(1.23);
			expect(round(1.235, { fractionDigits: 2 })).toBe(1.24);
		});

		it("should honour the rounding method", () => {
			expect(round(1.9, { roundingMethod: "floor" })).toBe(1);
			expect(round(1.1, { roundingMethod: "ceil" })).toBe(2);
			expect(round(-1.9, { roundingMethod: "trunc" })).toBe(-1);
			expect(round(1.239, { fractionDigits: 2, roundingMethod: "floor" })).toBe(
				1.23,
			);
		});
	});

	describe("significantDigits", () => {
		it("should keep the requested number of significant digits", () => {
			expect(round(123_456, { significantDigits: 2 })).toBe(120_000);
			expect(round(123_456, { significantDigits: 4 })).toBe(123_500);
			expect(round(1.234_56, { significantDigits: 3 })).toBe(1.23);
		});

		it("should scale with magnitude where fraction digits cannot", () => {
			expect(round(0.001_234, { significantDigits: 2 })).toBe(0.0012);
			expect(round(0.000_012_34, { significantDigits: 2 })).toBe(0.000_012);
		});

		it("should preserve the sign", () => {
			expect(round(-1234, { significantDigits: 2 })).toBe(-1200);
			expect(round(-0.001_234, { significantDigits: 2 })).toBe(-0.0012);
		});

		it("should leave a value that already fits untouched", () => {
			expect(round(1.5, { significantDigits: 8 })).toBe(1.5);
			expect(round(7, { significantDigits: 1 })).toBe(7);
		});

		it("should honour the rounding method", () => {
			expect(
				round(1.25, { significantDigits: 2, roundingMethod: "floor" }),
			).toBe(1.2);
			expect(
				round(1.21, { significantDigits: 2, roundingMethod: "ceil" }),
			).toBe(1.3);
			expect(
				round(1.29, { significantDigits: 2, roundingMethod: "trunc" }),
			).toBe(1.2);
			expect(
				round(-1.21, { significantDigits: 2, roundingMethod: "floor" }),
			).toBe(-1.3);
		});

		it("should round above the decimal point exactly", () => {
			expect(round(1234, { significantDigits: 1 })).toBe(1000);
			expect(round(987_654_321, { significantDigits: 3 })).toBe(988_000_000);
		});

		it("should return a value with no magnitude unchanged", () => {
			expect(round(0, { significantDigits: 3 })).toBe(0);
			expect(round(Number.NaN, { significantDigits: 3 })).toBeNaN();
			expect(round(Number.POSITIVE_INFINITY, { significantDigits: 3 })).toBe(
				Number.POSITIVE_INFINITY,
			);
		});

		it("should round an exact power of ten without drifting a decade", () => {
			expect(round(100, { significantDigits: 2 })).toBe(100);
			expect(round(0.01, { significantDigits: 2 })).toBe(0.01);
		});
	});
});
