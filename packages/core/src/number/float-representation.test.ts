import { describe, expect, it } from "vitest";

import { DBL_MIN } from "../constants/float.js";
import { isFinitePositive } from "./is-finite-positive.js";
import { isNormal } from "./is-normal.js";
import { isSubnormal } from "./is-subnormal.js";
import { nextAfter } from "./next-after.js";
import { ulpDistance } from "./ulp-distance.js";
import { ulp } from "./ulp.js";

describe("nextAfter", () => {
	it("steps one representable value toward the direction", () => {
		expect(nextAfter(1, 2)).toBe(1 + Number.EPSILON);
		expect(nextAfter(1, 0)).toBe(1 - Number.EPSILON / 2);
		expect(nextAfter(-1, 0)).toBe(-(1 - Number.EPSILON / 2));
		expect(nextAfter(-1, -2)).toBe(-(1 + Number.EPSILON));
	});

	it("leaves and reaches zero through the smallest subnormal", () => {
		expect(nextAfter(0, 1)).toBe(Number.MIN_VALUE);
		expect(nextAfter(0, -1)).toBe(-Number.MIN_VALUE);
		expect(nextAfter(Number.MIN_VALUE, 0)).toBe(0);
	});

	it("crosses the finite boundary", () => {
		expect(nextAfter(Number.MAX_VALUE, Number.POSITIVE_INFINITY)).toBe(
			Number.POSITIVE_INFINITY,
		);
		expect(nextAfter(Number.POSITIVE_INFINITY, 0)).toBe(Number.MAX_VALUE);
	});

	it("returns the direction when the two are equal", () => {
		expect(nextAfter(5, 5)).toBe(5);
	});

	it("propagates NaN", () => {
		expect(nextAfter(Number.NaN, 1)).toBeNaN();
		expect(nextAfter(1, Number.NaN)).toBeNaN();
	});
});

describe("ulpDistance", () => {
	it("counts representable steps", () => {
		expect(ulpDistance(1, 1)).toBe(0);
		expect(ulpDistance(1, nextAfter(1, 2))).toBe(1);
		expect(ulpDistance(1, 2)).toBe(2 ** 52);
	});

	it("treats the two zeros as equal", () => {
		expect(ulpDistance(0, -0)).toBe(0);
	});

	it("orders across the sign boundary", () => {
		expect(ulpDistance(-Number.MIN_VALUE, Number.MIN_VALUE)).toBe(2);
		expect(ulpDistance(-1, 1)).toBe(ulpDistance(1, -1));
	});

	it("is NaN when either input is NaN", () => {
		expect(ulpDistance(Number.NaN, 1)).toBeNaN();
	});
});

describe("ulp", () => {
	it("gives the gap to the next representable value", () => {
		expect(ulp(1)).toBe(Number.EPSILON);
		expect(ulp(0)).toBe(Number.MIN_VALUE);
		expect(ulp(-1)).toBe(Number.EPSILON);
	});

	it("stays finite at the largest finite value", () => {
		expect(Number.isFinite(ulp(Number.MAX_VALUE))).toBe(true);
		expect(ulp(Number.MAX_VALUE)).toBe(2 ** 971);
	});

	it("handles the non-finite cases", () => {
		expect(ulp(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
		expect(ulp(Number.NaN)).toBeNaN();
	});
});

describe("isFinitePositive / isNormal / isSubnormal", () => {
	it("classifies normal numbers", () => {
		expect(isNormal(1)).toBe(true);
		expect(isNormal(DBL_MIN)).toBe(true);
		expect(isNormal(0)).toBe(false);
		expect(isNormal(Number.MIN_VALUE)).toBe(false);
		expect(isNormal(Number.POSITIVE_INFINITY)).toBe(false);
		expect(isNormal(Number.NaN)).toBe(false);
	});

	it("classifies subnormal numbers", () => {
		expect(isSubnormal(Number.MIN_VALUE)).toBe(true);
		expect(isSubnormal(DBL_MIN / 2)).toBe(true);
		expect(isSubnormal(0)).toBe(false);
		expect(isSubnormal(1)).toBe(false);
		expect(isSubnormal(Number.NaN)).toBe(false);
	});

	it("classifies finite positives", () => {
		expect(isFinitePositive(1)).toBe(true);
		expect(isFinitePositive(0)).toBe(false);
		expect(isFinitePositive(-1)).toBe(false);
		expect(isFinitePositive(Number.POSITIVE_INFINITY)).toBe(false);
		expect(isFinitePositive(Number.NaN)).toBe(false);
	});
});
