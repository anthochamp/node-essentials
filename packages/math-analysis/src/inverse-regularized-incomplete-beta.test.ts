import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { inverseRegularizedIncompleteBeta } from "./inverse-regularized-incomplete-beta.js";
import { regularizedIncompleteBeta } from "./regularized-incomplete-beta.js";

// References from mpmath's root finder, checked identical at 80 and 200 digits.
const REFERENCE: readonly (readonly [
	a: number,
	b: number,
	p: number,
	expected: number,
])[] = [
	[0.5, 0.5, 0.5, 0.5],
	[2, 3, 0.25, 0.2430220837560763],
	[5, 2, 0.9, 0.9074047410868713],
	[10, 20, 0.05, 0.2004956976494994],
	[0.5, 4, 0.75, 0.1612839784001029],
];

/**
 * The iteration stops four ulps from the root, and the forward function it
 * drives to zero carries tens of its own.
 */
const TOLERANCE = 1e-13;

suite("inverseRegularizedIncompleteBeta", () => {
	test("matches published values", () => {
		for (const [a, b, p, expected] of REFERENCE) {
			expectCloseRelative(
				inverseRegularizedIncompleteBeta(a, b, p),
				expected,
				TOLERANCE,
			);
		}
	});

	test("is the identity for the uniform shape", () => {
		for (const p of [1e-6, 0.05, 0.3, 0.5, 0.77, 0.999]) {
			expectCloseRelative(
				inverseRegularizedIncompleteBeta(1, 1, p),
				p,
				TOLERANCE,
			);
		}
	});

	test("inverts the closed forms the endpoints reduce to", () => {
		// I_x(a, 1) = xᵃ and I_x(1, b) = 1 − (1 − x)ᵇ, both invertible by hand.
		for (const shape of [0.5, 2, 7]) {
			for (const p of [0.01, 0.4, 0.95]) {
				expectCloseRelative(
					inverseRegularizedIncompleteBeta(shape, 1, p),
					p ** (1 / shape),
					TOLERANCE,
				);
				expectCloseRelative(
					inverseRegularizedIncompleteBeta(1, shape, p),
					1 - (1 - p) ** (1 / shape),
					TOLERANCE,
				);
			}
		}
	});

	test("inverts the forward function across shapes and tails", () => {
		// Stops at `p = 0.99`: past that the quantile sits where `dI/dx` is steep,
		// so a correctly-rounded `x` still round-trips far from `p` and the check
		// measures the conditioning rather than the inverse.
		for (const a of [0.4, 1, 6, 250]) {
			for (const b of [0.4, 1, 6, 250]) {
				for (const p of [1e-6, 0.01, 0.3, 0.5, 0.9, 0.99]) {
					const x = inverseRegularizedIncompleteBeta(a, b, p);
					expectCloseRelative(regularizedIncompleteBeta(a, b, x), p, 1e-9);
				}
			}
		}
	});

	test("increases monotonically in the probability", () => {
		let previous = -1;
		for (const p of [1e-9, 1e-4, 0.01, 0.2, 0.5, 0.8, 0.99, 0.99999]) {
			const current = inverseRegularizedIncompleteBeta(3, 7, p);
			expect(current).toBeGreaterThan(previous);
			previous = current;
		}
	});

	test("pins the endpoints", () => {
		expect(inverseRegularizedIncompleteBeta(3, 5, 0)).toBe(0);
		expect(inverseRegularizedIncompleteBeta(3, 5, 1)).toBe(1);
	});

	test("rejects arguments outside the domain", () => {
		expect(() => inverseRegularizedIncompleteBeta(0, 1, 0.5)).toThrow(
			RangeError,
		);
		expect(() => inverseRegularizedIncompleteBeta(1, 0, 0.5)).toThrow(
			RangeError,
		);
		expect(() => inverseRegularizedIncompleteBeta(1, 1, -0.1)).toThrow(
			RangeError,
		);
		expect(() => inverseRegularizedIncompleteBeta(1, 1, 1.1)).toThrow(
			RangeError,
		);
	});

	test("throws when the signal is already aborted", () => {
		expect(() =>
			inverseRegularizedIncompleteBeta(2, 3, 0.5, {
				signal: AbortSignal.abort(),
			}),
		).toThrow();
	});
});
