import { describe, expect, it } from "vitest";

import type { EuclideanDomain, Field, Ring } from "./evidence.js";
import {
	checkEuclideanLaws,
	checkFieldLaws,
	checkOrderedFieldLaws,
	checkRingLaws,
} from "./laws.js";
import {
	FIELD,
	INTEGRAL_DOMAIN,
	isCommutativeRing,
	isField,
	isIntegralDomain,
	isOrderedField,
	isRing,
	MAGMA,
	MONOID,
	ORDERED_FIELD,
	RING,
	SEMIGROUP,
} from "./structure.js";

/** ℤ/nℤ as ring evidence over `number`. */
function modularRing(n: number): Ring<number> {
	const wrap = (a: number): number => ((a % n) + n) % n;

	return {
		zero: 0,
		one: wrap(1),
		add: (a, b) => wrap(a + b),
		sub: (a, b) => wrap(a - b),
		neg: (a) => wrap(-a),
		mul: (a, b) => wrap(a * b),
		eq: (a, b) => a === b,
	};
}

/** ℤ/pℤ as field evidence, valid only when `p` is prime. */
function modularField(p: number): Field<number> {
	const ring = modularRing(p);
	const inv = (a: number): number => {
		for (let candidate = 1; candidate < p; candidate++) {
			if (ring.mul(a, candidate) === 1) {
				return candidate;
			}
		}

		throw new RangeError(`${a} is not invertible modulo ${p}`);
	};

	return { ...ring, inv, div: (a, b) => ring.mul(a, inv(b)) };
}

const INTEGERS: EuclideanDomain<number> = {
	zero: 0,
	one: 1,
	add: (a, b) => a + b,
	sub: (a, b) => a - b,
	neg: (a) => -a,
	mul: (a, b) => a * b,
	eq: (a, b) => a === b,
	degree: (a) => Math.abs(a),
	divmod: (a, b) => ({
		quotient: Math.trunc(a / b),
		remainder: a % b,
	}),
};

describe("checkRingLaws", () => {
	it("accepts ℤ/7ℤ", () => {
		expect(checkRingLaws(modularRing(7), [0, 1, 2, 3, 5, 6])).toEqual([]);
	});

	it("accepts ℤ over small values", () => {
		expect(checkRingLaws(INTEGERS, [-3, -1, 0, 1, 2, 5])).toEqual([]);
	});

	it("reports the axiom that a broken operation violates", () => {
		const broken: Ring<number> = {
			...modularRing(7),
			mul: (a, b) => (a + b) % 7,
		};
		const laws = new Set(
			checkRingLaws(broken, [1, 2, 3]).map((violation) => violation.law),
		);

		expect(laws).toContain("multiplicative identity");
		expect(laws).toContain("left distributivity");
	});
});

describe("checkFieldLaws", () => {
	it("accepts ℤ/7ℤ, which is a field", () => {
		expect(checkFieldLaws(modularField(7), [0, 1, 2, 3, 4, 5, 6])).toEqual([]);
	});

	it("rejects ℤ, where only ±1 are invertible", () => {
		const notAField: Field<number> = {
			...INTEGERS,
			inv: (a) => Math.trunc(1 / a),
			div: (a, b) => Math.trunc(a / b),
		};
		const laws = checkFieldLaws(notAField, [1, 2, 3]).map(
			(violation) => violation.law,
		);

		expect(laws).toContain("multiplicative inverse");
	});
});

describe("checkOrderedFieldLaws", () => {
	it("accepts ℚ approximated by exact small rationals", () => {
		const rationals = {
			zero: 0,
			one: 1,
			add: (a: number, b: number) => a + b,
			sub: (a: number, b: number) => a - b,
			neg: (a: number) => -a,
			mul: (a: number, b: number) => a * b,
			eq: (a: number, b: number) => a === b,
			inv: (a: number) => 1 / a,
			div: (a: number, b: number) => a / b,
			cmp: (a: number, b: number) => (a < b ? -1 : a > b ? 1 : 0) as -1 | 0 | 1,
			abs: (a: number) => Math.abs(a),
			sign: (a: number) => (a < 0 ? -1 : a > 0 ? 1 : 0) as -1 | 0 | 1,
		};

		expect(checkOrderedFieldLaws(rationals, [-2, -0.5, 0, 0.5, 1, 2])).toEqual(
			[],
		);
	});

	it("catches an order that disagrees with equality", () => {
		const rationals = {
			zero: 0,
			one: 1,
			add: (a: number, b: number) => a + b,
			sub: (a: number, b: number) => a - b,
			neg: (a: number) => -a,
			mul: (a: number, b: number) => a * b,
			eq: (a: number, b: number) => a === b,
			inv: (a: number) => 1 / a,
			div: (a: number, b: number) => a / b,
			cmp: (a: number, b: number) => (a <= b ? -1 : 1) as -1 | 0 | 1,
			abs: (a: number) => Math.abs(a),
			sign: (a: number) => (a < 0 ? -1 : a > 0 ? 1 : 0) as -1 | 0 | 1,
		};
		const laws = new Set(
			checkOrderedFieldLaws(rationals, [1, 2]).map(
				(violation) => violation.law,
			),
		);

		expect(laws).toContain("reflexivity");
	});
});

describe("checkEuclideanLaws", () => {
	it("accepts ℤ with truncating division", () => {
		expect(checkEuclideanLaws(INTEGERS, [-7, -2, 1, 3, 8])).toEqual([]);
	});

	it("rejects a divmod whose remainder is not reduced", () => {
		const broken: EuclideanDomain<number> = {
			...INTEGERS,
			divmod: (a) => ({ quotient: 0, remainder: a }),
		};
		const laws = checkEuclideanLaws(broken, [2, 7]).map(
			(violation) => violation.law,
		);

		expect(laws).toContain("remainder is smaller than the divisor");
	});
});

describe("structure predicates", () => {
	it("classifies the multiplicative hierarchy", () => {
		expect(isRing(MAGMA)).toBe(false);
		expect(isRing(SEMIGROUP)).toBe(false);
		expect(isRing(MONOID)).toBe(false);
		expect(isRing(RING)).toBe(true);
	});

	it("separates a ring from an integral domain from a field", () => {
		expect(isCommutativeRing(RING)).toBe(false);
		expect(isIntegralDomain(INTEGRAL_DOMAIN)).toBe(true);
		expect(isField(INTEGRAL_DOMAIN)).toBe(false);
		expect(isField(FIELD)).toBe(true);
		expect(isOrderedField(FIELD)).toBe(false);
		expect(isOrderedField(ORDERED_FIELD)).toBe(true);
	});
});
