import { describe, expect, it } from "vitest";
import { round } from "./round.js";

describe("round", () => {
	it("should round numbers correctly", () => {
		expect(round(1.2345)).toBe(1);
		expect(round(1.2345, { fractionDigits: 2 })).toBeCloseTo(1.23, 2);
		expect(round(1.2355, { fractionDigits: 2 })).toBeCloseTo(1.24, 2);
		expect(round(-1.2345)).toBe(-1);
		expect(round(-1.2345, { fractionDigits: 2 })).toBeCloseTo(-1.23, 2);
		expect(round(-1.2355, { fractionDigits: 2 })).toBeCloseTo(-1.24, 2);
	});

	it("should floor numbers correctly", () => {
		expect(round(1.2345, { roundingMethod: "floor" })).toBe(1);
		expect(
			round(1.2345, { roundingMethod: "floor", fractionDigits: 2 }),
		).toBeCloseTo(1.23, 2);
		expect(
			round(1.2355, { roundingMethod: "floor", fractionDigits: 2 }),
		).toBeCloseTo(1.23, 2);
		expect(round(-1.2345, { roundingMethod: "floor" })).toBe(-2);
		expect(
			round(-1.2345, { roundingMethod: "floor", fractionDigits: 2 }),
		).toBeCloseTo(-1.24, 2);
		expect(
			round(-1.2355, { roundingMethod: "floor", fractionDigits: 2 }),
		).toBeCloseTo(-1.24, 2);
	});

	it("should ceil numbers correctly", () => {
		expect(round(1.2345, { roundingMethod: "ceil" })).toBe(2);
		expect(
			round(1.2345, { roundingMethod: "ceil", fractionDigits: 2 }),
		).toBeCloseTo(1.24, 2);
		expect(
			round(1.2355, { roundingMethod: "ceil", fractionDigits: 2 }),
		).toBeCloseTo(1.24, 2);
		expect(round(-1.2345, { roundingMethod: "ceil" })).toBe(-1);
		expect(
			round(-1.2345, { roundingMethod: "ceil", fractionDigits: 2 }),
		).toBeCloseTo(-1.23, 2);
		expect(
			round(-1.2355, { roundingMethod: "ceil", fractionDigits: 2 }),
		).toBeCloseTo(-1.23, 2);
	});

	it("should use default options when none are provided", () => {
		expect(round(1.5678)).toBe(2);
		expect(round(1.5678, {})).toBe(2);
		expect(round(1.5678, { fractionDigits: undefined })).toBe(2);
		expect(round(1.5678, { roundingMethod: undefined })).toBe(2);
	});
});
