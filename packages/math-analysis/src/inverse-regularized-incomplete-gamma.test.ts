import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { inverseRegularizedIncompleteGamma } from "./inverse-regularized-incomplete-gamma.js";
import { regularizedIncompleteGamma } from "./regularized-incomplete-gamma.js";

// References from mpmath's root finder, checked identical at 80 and 200 digits.
const REFERENCE: readonly (readonly [
	a: number,
	p: number,
	expected: number,
])[] = [
	[0.5, 0.5, 0.2274682115597864],
	[1, 0.5, 0.6931471805599453],
	[2, 0.25, 0.9612787631147771],
	[5, 0.9, 7.9935895860526305],
	[10, 0.05, 5.425405697091293],
	[100, 0.975, 120.52894775315546],
	[1000, 0.01, 927.9081597966425],
];

/**
 * The iteration stops four ulps from the root, and the forward function it
 * drives to zero carries tens of its own.
 */
const TOLERANCE = 1e-13;

suite("inverseRegularizedIncompleteGamma", () => {
	test("matches published values", () => {
		for (const [a, p, expected] of REFERENCE) {
			expectCloseRelative(
				inverseRegularizedIncompleteGamma(a, p),
				expected,
				TOLERANCE,
			);
		}
	});

	test("reproduces the exponential quantile at shape one", () => {
		// P(1, x) = 1 − e^(−x), so the inverse is −ln(1 − p) in closed form.
		for (const p of [1e-6, 0.01, 0.25, 0.5, 0.9, 0.999]) {
			expectCloseRelative(
				inverseRegularizedIncompleteGamma(1, p),
				-Math.log1p(-p),
				TOLERANCE,
			);
		}
	});

	test("inverts the forward function across shapes and tails", () => {
		for (const a of [0.3, 1, 7.5, 200, 5000]) {
			for (const p of [1e-8, 0.001, 0.1, 0.5, 0.9, 0.9999]) {
				const x = inverseRegularizedIncompleteGamma(a, p);
				expectCloseRelative(regularizedIncompleteGamma(a, x), p, 1e-11);
			}
		}
	});

	test("increases monotonically in the probability", () => {
		let previous = -1;
		for (const p of [1e-9, 1e-4, 0.01, 0.2, 0.5, 0.8, 0.99, 0.99999]) {
			const current = inverseRegularizedIncompleteGamma(4, p);
			expect(current).toBeGreaterThan(previous);
			previous = current;
		}
	});

	test("pins the endpoints", () => {
		expect(inverseRegularizedIncompleteGamma(3, 0)).toBe(0);
		expect(inverseRegularizedIncompleteGamma(3, 1)).toBe(
			Number.POSITIVE_INFINITY,
		);
	});

	test("rejects arguments outside the domain", () => {
		expect(() => inverseRegularizedIncompleteGamma(0, 0.5)).toThrow(RangeError);
		expect(() => inverseRegularizedIncompleteGamma(-1, 0.5)).toThrow(
			RangeError,
		);
		expect(() => inverseRegularizedIncompleteGamma(1, -0.1)).toThrow(
			RangeError,
		);
		expect(() => inverseRegularizedIncompleteGamma(1, 1.1)).toThrow(RangeError);
	});

	test("throws when the signal is already aborted", () => {
		expect(() =>
			inverseRegularizedIncompleteGamma(5, 0.5, {
				signal: AbortSignal.abort(),
			}),
		).toThrow();
	});
});
