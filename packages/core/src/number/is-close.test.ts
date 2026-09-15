import { expect, suite, test } from "vitest";

import { isCloseAbsolute } from "./is-close-absolute.js";
import { isCloseRelative } from "./is-close-relative.js";
import { isCloseTo } from "./is-close-to.js";
import { isCloseUlp } from "./is-close-ulp.js";

const NON_FINITE = [
	Number.NaN,
	Number.POSITIVE_INFINITY,
	Number.NEGATIVE_INFINITY,
];

suite("isCloseRelative", () => {
	test("accepts values within the relative bound", () => {
		expect(isCloseRelative(1000, 1000.001, 1e-6)).toBe(true);
		expect(isCloseRelative(1000, 1001, 1e-6)).toBe(false);
	});

	test("scales with the operands", () => {
		expect(isCloseRelative(1e-6, 1.0000001e-6, 1e-6)).toBe(true);
		expect(isCloseRelative(1e6, 1.0000001e6, 1e-6)).toBe(true);
	});

	test("is undefined at the origin — nothing but 0 is relatively close to 0", () => {
		expect(isCloseRelative(0, 1e-300, 0.5)).toBe(false);
		expect(isCloseRelative(0, 0, 0)).toBe(true);
	});

	test("rejects NaN and mismatched infinities, accepts an infinity against itself", () => {
		for (const value of NON_FINITE) {
			expect(isCloseRelative(value, 1, 1)).toBe(false);
			expect(isCloseRelative(1, value, 1)).toBe(false);
		}
		expect(
			isCloseRelative(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 0),
		).toBe(true);
		expect(isCloseRelative(Number.NaN, Number.NaN, 1)).toBe(false);
	});
});

suite("isCloseAbsolute", () => {
	test("accepts values within the absolute bound", () => {
		expect(isCloseAbsolute(1, 1.0005, 1e-3)).toBe(true);
		expect(isCloseAbsolute(1, 1.005, 1e-3)).toBe(false);
	});

	test("holds at the origin, where the relative form collapses", () => {
		expect(isCloseAbsolute(0, 1e-300, 1e-12)).toBe(true);
		expect(isCloseRelative(0, 1e-300, 1e-12)).toBe(false);
	});

	test("stops meaning anything far from its own scale", () => {
		expect(isCloseAbsolute(1e12, 1e12 + 1, 1e-9)).toBe(false);
	});

	test("rejects NaN and mismatched infinities", () => {
		for (const value of NON_FINITE) {
			expect(isCloseAbsolute(value, 1, 1)).toBe(false);
		}
	});
});

suite("isCloseUlp", () => {
	test("accepts values within the given number of representable steps", () => {
		expect(isCloseUlp(1, 1 + Number.EPSILON)).toBe(true);
		expect(isCloseUlp(1, 1 + Number.EPSILON * 8)).toBe(false);
		expect(isCloseUlp(1, 1 + Number.EPSILON * 8, 8)).toBe(true);
	});

	test("cannot express closeness to zero", () => {
		expect(isCloseUlp(0, 1e-300)).toBe(false);
		expect(isCloseUlp(0, Number.MIN_VALUE)).toBe(true);
	});

	test("rejects NaN and treats -0 as +0", () => {
		expect(isCloseUlp(Number.NaN, Number.NaN)).toBe(false);
		expect(isCloseUlp(-0, 0)).toBe(true);
	});
});

suite("isCloseTo", () => {
	test("accepts under either bound", () => {
		expect(isCloseTo(0, 1e-13, { absTol: 1e-12 })).toBe(true);
		expect(isCloseTo(1e12, 1e12 + 1, { relTol: 1e-9 })).toBe(true);
		expect(isCloseTo(1e12, 1e12 + 1, { absTol: 1e-12 })).toBe(false);
	});

	test("asks for exact equality when neither bound is given", () => {
		expect(isCloseTo(1, 1, {})).toBe(true);
		expect(isCloseTo(1, 1 + Number.EPSILON, {})).toBe(false);
	});

	test("is symmetric", () => {
		const tolerance = { relTol: 1e-9, absTol: 1e-12 };

		for (const [a, b] of [
			[1, 1 + 1e-10],
			[0, 1e-13],
			[1e12, 1e12 + 1],
			[-5, 5],
		] as const) {
			expect(isCloseTo(a, b, tolerance)).toBe(isCloseTo(b, a, tolerance));
		}
	});

	test("is the disjunction of the relative and absolute forms", () => {
		const values = [
			0,
			-0,
			1e-300,
			1e-12,
			1e-9,
			0.5,
			1,
			1 + Number.EPSILON,
			1e6,
			1e12,
			-1,
			-1e6,
		];
		const tolerances = [
			{ relTol: 0, absTol: 0 },
			{ relTol: 1e-9, absTol: 0 },
			{ relTol: 0, absTol: 1e-12 },
			{ relTol: 1e-6, absTol: 1e-9 },
		];

		for (const { relTol, absTol } of tolerances) {
			for (const a of values) {
				for (const b of values) {
					expect(isCloseTo(a, b, { relTol, absTol })).toBe(
						isCloseRelative(a, b, relTol) || isCloseAbsolute(a, b, absTol),
					);
				}
			}
		}
	});

	test("rejects NaN and mismatched infinities, accepts an infinity against itself", () => {
		const tolerance = { relTol: 1, absTol: 1 };

		for (const value of NON_FINITE) {
			expect(isCloseTo(value, 1, tolerance)).toBe(false);
			expect(isCloseTo(1, value, tolerance)).toBe(false);
		}
		expect(
			isCloseTo(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, tolerance),
		).toBe(false);
		expect(
			isCloseTo(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, tolerance),
		).toBe(true);
	});
});
