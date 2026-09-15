import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { logGamma } from "./log-gamma.js";

// References from mpmath, checked identical at 80 and 200 digits.
const REFERENCE: readonly (readonly [x: number, expected: number])[] = [
	[0.1, 2.252712651734206],
	[0.5, 0.5723649429247001],
	[1.5, -0.12078223763524522],
	[5, 3.1780538303479458],
	[10, 12.801827480081469],
	[100, 359.1342053695754],
	[1e5, 1051287.7089736569],
];

/**
 * About 45 ulps. Relative error is a harsh measure for a function with zeros at
 * 1 and 2: at `x = 1.5` the value is `-0.12`, so one ulp of absolute error
 * reads as `1.8e-15` relative.
 */
const TOLERANCE = 1e-14;

suite("logGamma", () => {
	test("matches published values across four decades", () => {
		for (const [x, expected] of REFERENCE) {
			expectCloseRelative(logGamma(x), expected, TOLERANCE);
		}
	});

	test("is zero to the last bit at the two fixed points", () => {
		// Γ(1) = Γ(2) = 1, so the log is 0; the series lands within one ulp of it.
		expect(Math.abs(logGamma(1))).toBeLessThan(1e-15);
		expect(Math.abs(logGamma(2))).toBeLessThan(1e-15);
	});

	test("agrees with the log of the exact factorial at the integers", () => {
		// From 2, because `logGamma(2)` is `log(1!) = 0` and a relative comparison
		// against an exact zero has nothing to measure.
		let factorial = 1;
		for (let n = 2; n <= 20; n++) {
			factorial *= n;
			expectCloseRelative(logGamma(n + 1), Math.log(factorial), TOLERANCE);
		}
	});

	test("stays finite far past where the gamma function overflows", () => {
		expect(Number.isFinite(logGamma(1e30))).toBe(true);
	});

	test("returns NaN where no real logarithm of the gamma exists", () => {
		expect(logGamma(0)).toBeNaN();
		expect(logGamma(-1)).toBeNaN();
		expect(logGamma(-1.5)).toBeNaN();
		expect(logGamma(Number.NaN)).toBeNaN();
	});
});
