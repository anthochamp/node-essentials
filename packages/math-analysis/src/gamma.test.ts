import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { gamma } from "./gamma.js";

// References from mpmath, each checked to be identical at 80 and 200 digits of
// working precision, and evaluated at the exact binary64 the test passes — not
// at the decimal that prints the same. Γ is steep enough at 171.6 that those two
// arguments differ in the answer by 3e-14.
const REFERENCE: readonly (readonly [x: number, expected: number])[] = [
	[0.1, 9.51350769866873],
	[0.5, 1.772453850905516],
	[1.5, 0.886226925452758],
	[10, 362880],
	[20, 1.21645100408832e17],
	[150, 3.80892263763057e260],
	[171.6, 1.5858969096672565e308],
	[-0.5, -3.544907701811032],
	[-1.5, 2.363271801207355],
	[-2.5, -0.9453087204829419],
];

/** About 4.5 ulps; the measured worst case over this table is 2. */
const TOLERANCE = 1e-15;

suite("gamma", () => {
	test("matches published values on both sides of the origin", () => {
		for (const [x, expected] of REFERENCE) {
			expectCloseRelative(gamma(x), expected, TOLERANCE);
		}
	});

	test("reproduces the factorials while they stay representable", () => {
		let factorial = 1;
		for (let n = 1; n <= 20; n++) {
			expectCloseRelative(gamma(n), factorial, TOLERANCE);
			factorial *= n;
		}
	});

	test("satisfies the recurrence that defines it", () => {
		for (const x of [0.3, 1.7, 4.2, 9.9, 30.5]) {
			// Two independent evaluations either side, so twice the single-call bound.
			expectCloseRelative(gamma(x + 1), x * gamma(x), 2 * TOLERANCE);
		}
	});

	test("satisfies Euler's reflection formula", () => {
		for (const x of [0.2, 0.37, 0.499, -1.3, -3.6]) {
			expectCloseRelative(
				gamma(x) * gamma(1 - x),
				Math.PI / Math.sin(Math.PI * x),
				TOLERANCE,
			);
		}
	});

	test("overflows to infinity only past the largest representable value", () => {
		expect(Number.isFinite(gamma(171.6))).toBe(true);
		expect(gamma(172)).toBe(Number.POSITIVE_INFINITY);
	});

	test("returns NaN at the poles, where the one-sided limits disagree", () => {
		expect(gamma(0)).toBeNaN();
		expect(gamma(-1)).toBeNaN();
		expect(gamma(-10)).toBeNaN();
		expect(gamma(Number.NaN)).toBeNaN();
	});
});
