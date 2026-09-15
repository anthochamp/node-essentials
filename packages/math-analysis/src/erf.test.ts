import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { erf } from "./erf.js";

// References from mpmath, checked identical at 80 and 200 digits. SciPy has
// `erf(1)` one ulp low, so these are not SciPy's numbers.
const REFERENCE: readonly (readonly [x: number, expected: number])[] = [
	[0.1, 0.1124629160182849],
	[0.5, 0.5204998778130465],
	[1, 0.8427007929497149],
	[2, 0.9953222650189527],
	[3, 0.9999779095030014],
	[-1, -0.8427007929497149],
	[-2.5, -0.999593047982555],
];

/** About 4.5 ulps; the measured worst case over this table is 1. */
const TOLERANCE = 1e-15;

suite("erf", () => {
	test("matches published values on both sides of the origin", () => {
		for (const [x, expected] of REFERENCE) {
			expectCloseRelative(erf(x), expected, TOLERANCE);
		}
	});

	test("is exactly zero at the origin", () => {
		expect(erf(0)).toBe(0);
	});

	test("is odd", () => {
		for (const x of [0.25, 0.9, 1.6, 4]) {
			expectCloseRelative(erf(-x), -erf(x));
		}
	});

	test("saturates at the unit bounds", () => {
		expect(erf(6)).toBe(1);
		expect(erf(-6)).toBe(-1);
		expect(erf(Number.POSITIVE_INFINITY)).toBe(1);
		expect(erf(Number.NEGATIVE_INFINITY)).toBe(-1);
	});

	test("survives an argument whose square overflows", () => {
		expect(erf(1e200)).toBe(1);
		expect(erf(-1e200)).toBe(-1);
	});

	test("propagates NaN", () => {
		expect(erf(Number.NaN)).toBeNaN();
	});
});
