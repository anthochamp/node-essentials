import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { regularizedIncompleteGammaUpper } from "./regularized-incomplete-gamma-upper.js";
import { regularizedIncompleteGamma } from "./regularized-incomplete-gamma.js";

// References from mpmath, checked identical at 80 and 200 digits. The set
// straddles the `x = a + 1` crossover in both directions, since the two
// expansions either side of it are entirely different code.
const REFERENCE: readonly (readonly [
	a: number,
	x: number,
	expected: number,
])[] = [
	[0.5, 0.25, 0.5204998778130465],
	[1, 1, 0.6321205588285577],
	[2, 3, 0.8008517265285442],
	[5, 2, 0.05265301734371116],
	[5, 10, 0.970747311923039],
	[10, 15, 0.9301463393005902],
	[100, 90, 0.15822098918643016],
	[1000, 900, 0.0005499022657117829],
	[1e4, 1e4, 0.5013298083399552],
];

/** About 45 ulps; the measured worst case over this table is 17. */
const TOLERANCE = 1e-14;

suite("regularizedIncompleteGamma", () => {
	test("matches published values either side of the crossover", () => {
		for (const [a, x, expected] of REFERENCE) {
			expectCloseRelative(
				regularizedIncompleteGamma(a, x),
				expected,
				TOLERANCE,
			);
		}
	});

	test("is zero at the origin for every shape", () => {
		for (const a of [0.25, 1, 7.5, 400]) {
			expect(regularizedIncompleteGamma(a, 0)).toBe(0);
		}
	});

	test("reproduces the exponential distribution at shape one", () => {
		// P(1, x) = 1 − e^(−x), a closed form owing nothing to either expansion.
		for (const x of [0.1, 0.5, 1, 3, 12]) {
			expectCloseRelative(regularizedIncompleteGamma(1, x), -Math.expm1(-x));
		}
	});

	test("complements the upper form", () => {
		for (const [a, x] of [
			[0.5, 0.25],
			[2, 3],
			[5, 2],
			[10, 15],
		]) {
			expectCloseRelative(
				regularizedIncompleteGamma(a!, x!) +
					regularizedIncompleteGammaUpper(a!, x!),
				1,
			);
		}
	});

	test("increases monotonically in x", () => {
		let previous = -1;
		for (let x = 0; x <= 20; x += 0.5) {
			const current = regularizedIncompleteGamma(3, x);
			expect(current).toBeGreaterThan(previous);
			previous = current;
		}
	});

	test("rejects arguments outside the domain", () => {
		expect(() => regularizedIncompleteGamma(0, 1)).toThrow(RangeError);
		expect(() => regularizedIncompleteGamma(-1, 1)).toThrow(RangeError);
		expect(() => regularizedIncompleteGamma(1, -1)).toThrow(RangeError);
		expect(() => regularizedIncompleteGamma(Number.NaN, 1)).toThrow(RangeError);
	});
});
