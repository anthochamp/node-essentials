import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { ConvergenceError } from "./convergence-error.js";
import { regularizedIncompleteGammaUpper } from "./regularized-incomplete-gamma-upper.js";
import { regularizedIncompleteGamma } from "./regularized-incomplete-gamma.js";

// References from mpmath, checked identical at 80 and 200 digits.
const REFERENCE: readonly (readonly [
	a: number,
	x: number,
	expected: number,
])[] = [
	[0.5, 0.25, 0.4795001221869535],
	[1, 1, 0.36787944117144233],
	[2, 3, 0.19914827347145578],
	[5, 2, 0.9473469826562888],
	[5, 10, 0.029252688076961072],
	[10, 15, 0.06985366069940976],
	[100, 90, 0.8417790108135699],
	[0.5, 36, 2.1519736712498913e-17],
	[0.5, 338, 4.9521266310067785e-149],
	[1000, 1100, 0.0010593232539299773],
];

/** About 45 ulps; the measured worst case over this table is 9. */
const TOLERANCE = 1e-14;

suite("regularizedIncompleteGammaUpper", () => {
	test("matches published values either side of the crossover", () => {
		for (const [a, x, expected] of REFERENCE) {
			expectCloseRelative(
				regularizedIncompleteGammaUpper(a, x),
				expected,
				TOLERANCE,
			);
		}
	});

	test("is one at the origin for every shape", () => {
		for (const a of [0.25, 1, 7.5, 400]) {
			expect(regularizedIncompleteGammaUpper(a, 0)).toBe(1);
		}
	});

	test("reproduces the exponential survival function at shape one", () => {
		for (const x of [0.1, 0.5, 1, 3, 12]) {
			expectCloseRelative(regularizedIncompleteGammaUpper(1, x), Math.exp(-x));
		}
	});

	test("keeps relative precision in a tail the lower form rounds away", () => {
		// The complement is exactly 1 here, so `1 - P` would report the tail as 0.
		expect(regularizedIncompleteGamma(0.5, 400)).toBe(1);
		expect(regularizedIncompleteGammaUpper(0.5, 400)).toBeGreaterThan(0);
		expect(regularizedIncompleteGammaUpper(0.5, 400)).toBeLessThan(1e-170);
	});

	test("decreases monotonically in x", () => {
		let previous = 2;
		for (let x = 0; x <= 20; x += 0.5) {
			const current = regularizedIncompleteGammaUpper(3, x);
			expect(current).toBeLessThan(previous);
			previous = current;
		}
	});

	test("reports non-convergence rather than an unconverged number", () => {
		expect(() =>
			regularizedIncompleteGammaUpper(50, 40, { maxIterations: 1 }),
		).toThrow(ConvergenceError);
	});

	test("rejects arguments outside the domain", () => {
		expect(() => regularizedIncompleteGammaUpper(0, 1)).toThrow(RangeError);
		expect(() => regularizedIncompleteGammaUpper(1, -1)).toThrow(RangeError);
	});
});
