import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { regularizedIncompleteBeta } from "./regularized-incomplete-beta.js";

// References from mpmath, checked identical at 80 and 200 digits, spanning both
// sides of the `(a + 1) / (a + b + 2)` crossover where the symmetry branch takes
// over.
const REFERENCE: readonly (readonly [
	a: number,
	b: number,
	x: number,
	expected: number,
])[] = [
	[0.5, 0.5, 0.5, 0.5],
	[2, 3, 0.4, 0.5248],
	[5, 2, 0.8, 0.6553600000000002],
	[1, 1, 0.3, 0.3],
	[30, 40, 0.4, 0.31814380259056296],
	[0.1, 0.2, 0.9, 0.7804880320024467],
	[500, 300, 0.6, 0.07292159199253169],
	[1000, 2, 0.999, 0.7353908495419278],
];

/** About 45 ulps; the measured worst case over this table is 15. */
const TOLERANCE = 1e-14;

suite("regularizedIncompleteBeta", () => {
	test("matches published values", () => {
		for (const [a, b, x, expected] of REFERENCE) {
			expectCloseRelative(
				regularizedIncompleteBeta(a, b, x),
				expected,
				TOLERANCE,
			);
		}
	});

	test("pins the endpoints exactly", () => {
		expect(regularizedIncompleteBeta(3, 5, 0)).toBe(0);
		expect(regularizedIncompleteBeta(3, 5, 1)).toBe(1);
	});

	test("is the identity for the uniform shape", () => {
		for (const x of [0.05, 0.3, 0.5, 0.77, 0.99]) {
			expectCloseRelative(regularizedIncompleteBeta(1, 1, x), x, TOLERANCE);
		}
	});

	test("reduces to a power when the second shape is one", () => {
		// I_x(a, 1) = xᵃ, a closed form the continued fraction knows nothing of.
		for (const a of [0.5, 2, 7]) {
			for (const x of [0.2, 0.6, 0.95]) {
				expectCloseRelative(
					regularizedIncompleteBeta(a, 1, x),
					x ** a,
					TOLERANCE,
				);
			}
		}
	});

	test("obeys the reflection symmetry across the whole domain", () => {
		for (const [a, b] of [
			[2, 5],
			[0.4, 3.2],
			[12, 12],
		]) {
			for (const x of [0.1, 0.35, 0.5, 0.8, 0.97]) {
				// Checked as a sum rather than as `I − (1 − I′)`: subtracting two values
				// that agree to fifteen digits would measure the subtraction instead.
				expectCloseRelative(
					regularizedIncompleteBeta(a!, b!, x) +
						regularizedIncompleteBeta(b!, a!, 1 - x),
					1,
					TOLERANCE,
				);
			}
		}
	});

	test("increases monotonically in x", () => {
		let previous = -1;
		for (let x = 0; x <= 1; x += 0.05) {
			const current = regularizedIncompleteBeta(2, 6, x);
			expect(current).toBeGreaterThan(previous);
			previous = current;
		}
	});

	test("rejects arguments outside the domain", () => {
		expect(() => regularizedIncompleteBeta(0, 1, 0.5)).toThrow(RangeError);
		expect(() => regularizedIncompleteBeta(1, 0, 0.5)).toThrow(RangeError);
		expect(() => regularizedIncompleteBeta(1, 1, -0.1)).toThrow(RangeError);
		expect(() => regularizedIncompleteBeta(1, 1, 1.1)).toThrow(RangeError);
	});
});
