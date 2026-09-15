import { expect, suite, test } from "vitest";

import {
	compareNaturalAscending,
	compareNaturalDescending,
} from "./compare-natural.js";

suite("compareNaturalAscending", () => {
	test("orders numbers", () => {
		expect(compareNaturalAscending(1, 10)).toBe(-1);
		expect(compareNaturalAscending(10, 1)).toBe(1);
		expect(compareNaturalAscending(1, 1)).toBe(0);
	});

	test("orders strings and bigints", () => {
		expect(compareNaturalAscending("a", "b")).toBe(-1);
		expect(compareNaturalAscending("b", "a")).toBe(1);
		expect(compareNaturalAscending(1n, 2n)).toBe(-1);
	});

	test("is exact — adjacent representable numbers are not equivalent", () => {
		expect(compareNaturalAscending(1, 1 + Number.EPSILON)).toBe(-1);
		expect(compareNaturalAscending(1 + Number.EPSILON, 1)).toBe(1);
	});

	test("treats -0 and +0 as equivalent, agreeing with `===`", () => {
		expect(compareNaturalAscending(-0, 0)).toBe(0);
		expect(compareNaturalAscending(0, -0)).toBe(0);
	});

	test("sorts NaN after every other value, and equivalent to itself", () => {
		expect(compareNaturalAscending(Number.NaN, 1)).toBe(1);
		expect(compareNaturalAscending(1, Number.NaN)).toBe(-1);
		expect(compareNaturalAscending(Number.NaN, Number.NaN)).toBe(0);
		expect(compareNaturalAscending(Number.NaN, Number.POSITIVE_INFINITY)).toBe(
			1,
		);
	});

	test("is antisymmetric across every pair, NaN included", () => {
		const values = [
			Number.NEGATIVE_INFINITY,
			-1,
			-0,
			0,
			1,
			Number.POSITIVE_INFINITY,
			Number.NaN,
		];

		for (const a of values) {
			for (const b of values) {
				expect(
					compareNaturalAscending(a, b) + compareNaturalAscending(b, a),
				).toBe(0);
			}
		}
	});

	test("is a total order once sorted", () => {
		const sorted = [3, Number.NaN, -0, 1, Number.NaN, -2].toSorted(
			compareNaturalAscending,
		);

		expect(sorted.slice(0, 4)).toEqual([-2, -0, 1, 3]);
		expect(sorted.slice(4).every(Number.isNaN)).toBe(true);
	});
});

suite("compareNaturalDescending", () => {
	test("is the reverse of the ascending order", () => {
		expect(compareNaturalDescending(1, 10)).toBe(1);
		expect(compareNaturalDescending(10, 1)).toBe(-1);
		expect(compareNaturalDescending(1, 1)).toBe(0);
	});
});
