import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { beta } from "./beta.js";

// References from mpmath, checked identical at 80 and 200 digits. `B(200, 200)`
// is cross-checked against exact integer arithmetic — `199!·199!/399!` as a
// `Fraction` — because SciPy's own `beta` is 1.8e-13 out there and would have
// pinned the wrong number.
const REFERENCE: readonly (readonly [
	a: number,
	b: number,
	expected: number,
])[] = [
	[1, 1, 1],
	[2, 3, 0.08333333333333333],
	[0.5, 0.5, 3.141592653589793],
	[5, 7, 0.0004329004329004329],
	[0.1, 0.1, 19.71463948905016],
	[1000, 0.5, 0.056056918840616005],
	[200, 200, 9.713217247611181e-122],
];

/** About 45 ulps; the measured worst case over this table is 9. */
const TOLERANCE = 1e-14;

suite("beta", () => {
	test("matches published values", () => {
		for (const [a, b, expected] of REFERENCE) {
			expectCloseRelative(beta(a, b), expected, TOLERANCE);
		}
	});

	test("is symmetric in its arguments", () => {
		for (const [a, b] of [
			[2, 7],
			[0.3, 4.5],
			[13, 1.5],
		]) {
			expectCloseRelative(beta(a!, b!), beta(b!, a!));
		}
	});

	test("reduces to the reciprocal binomial identity at the integers", () => {
		// B(m, n) = (m − 1)!(n − 1)! / (m + n − 1)!
		expectCloseRelative(beta(3, 4), (2 * 6) / 720);
		expectCloseRelative(beta(6, 2), (120 * 1) / 5040);
	});

	test("stays representable where each gamma factor alone overflows", () => {
		expect(Number.isFinite(beta(200, 200))).toBe(true);
		expect(beta(200, 200)).toBeGreaterThan(0);
	});

	test("returns NaN for a non-positive shape", () => {
		expect(beta(0, 1)).toBeNaN();
		expect(beta(1, -2)).toBeNaN();
		expect(beta(Number.NaN, 1)).toBeNaN();
	});
});
