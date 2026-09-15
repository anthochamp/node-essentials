import { checkOrderedFieldLaws, type OrderedField } from "@ac-kit/math-algebra";
import { bigIntGcd } from "@ac-kit/math-integer";
import { describe, expect, it } from "vitest";

import { rationalAbs } from "./rational-abs.js";
import { rationalAdd } from "./rational-add.js";
import { rationalCompare } from "./rational-compare.js";
import { rationalDiv } from "./rational-div.js";
import { rationalFromNumber } from "./rational-from-number.js";
import { rationalIntegralFractional } from "./rational-integral-fractional.js";
import { rationalInv } from "./rational-inv.js";
import { rationalIsEqual } from "./rational-is-equal.js";
import { rationalMul } from "./rational-mul.js";
import { rationalNeg } from "./rational-neg.js";
import { rationalNormalize } from "./rational-normalize.js";
import { rationalReduce } from "./rational-reduce.js";
import { rationalSign } from "./rational-sign.js";
import { rationalSqrtExact } from "./rational-sqrt-exact.js";
import { rationalSub } from "./rational-sub.js";
import { rationalToNumber } from "./rational-to-number.js";
import { rationalToString } from "./rational-to-string.js";
import { Rational, RATIONAL_ONE, RATIONAL_ZERO } from "./rational-types.js";

const FIELD: OrderedField<Rational> = {
	zero: RATIONAL_ZERO,
	one: RATIONAL_ONE,
	add: rationalAdd,
	sub: rationalSub,
	neg: rationalNeg,
	mul: rationalMul,
	eq: rationalIsEqual,
	inv: rationalInv,
	div: rationalDiv,
	cmp: rationalCompare,
	abs: rationalAbs,
	sign: rationalSign,
};

const SAMPLES: readonly Rational[] = [
	rationalNormalize(-3n, 4n),
	rationalNormalize(-1n),
	RATIONAL_ZERO,
	rationalNormalize(1n, 3n),
	rationalNormalize(2n),
	rationalNormalize(5n, 6n),
];

describe("rational", () => {
	it("moves the sign onto the numerator", () => {
		const value = rationalNormalize(1n, -3n);

		expect(value.numerator).toBe(-1n);
		expect(value.denominator).toBe(3n);
	});

	it("rejects a zero denominator", () => {
		expect(() => rationalNormalize(1n, 0n)).toThrow(RangeError);
	});
});

describe("ratReduce", () => {
	it("divides out the greatest common divisor", () => {
		const value = rationalReduce(rationalNormalize(6n, 8n));

		expect(value.numerator).toBe(3n);
		expect(value.denominator).toBe(4n);
		expect(value.reduced).toBe(true);
	});

	it("is idempotent and returns the same object when already reduced", () => {
		const once = rationalReduce(rationalNormalize(6n, 8n));

		expect(rationalReduce(once)).toBe(once);
	});
});

describe("arithmetic", () => {
	it("adds by cross-multiplication", () => {
		expect(
			rationalToString(
				rationalReduce(
					rationalAdd(rationalNormalize(1n, 3n), rationalNormalize(1n, 6n)),
				),
			),
		).toBe("1/2");
	});

	it("keeps the denominator at the lcm rather than the product", () => {
		const sum = rationalAdd(
			rationalNormalize(1n, 6n),
			rationalNormalize(1n, 10n),
		);

		expect(sum.denominator).toBe(15n);
		expect(sum.numerator).toBe(4n);
	});

	it("cross-cancels before multiplying", () => {
		const product = rationalMul(
			rationalNormalize(2n, 3n),
			rationalNormalize(3n, 4n),
		);

		expect(product.numerator).toBe(1n);
		expect(product.denominator).toBe(2n);
	});

	it("divides", () => {
		expect(
			rationalToString(
				rationalReduce(
					rationalDiv(rationalNormalize(1n, 2n), rationalNormalize(3n, 4n)),
				),
			),
		).toBe("2/3");
	});

	it("rejects inverting zero", () => {
		expect(() => rationalInv(RATIONAL_ZERO)).toThrow(RangeError);
	});
});

describe("comparison", () => {
	it("orders by cross-multiplication", () => {
		expect(
			rationalCompare(rationalNormalize(1n, 3n), rationalNormalize(1n, 2n)),
		).toBe(-1);
		expect(
			rationalCompare(rationalNormalize(1n, 2n), rationalNormalize(2n, 4n)),
		).toBe(0);
		expect(
			rationalCompare(rationalNormalize(-1n, 2n), rationalNormalize(-1n, 3n)),
		).toBe(-1);
	});

	it("reports the sign", () => {
		expect(rationalSign(rationalNormalize(-1n, 2n))).toBe(-1);
		expect(rationalSign(RATIONAL_ZERO)).toBe(0);
		expect(rationalSign(rationalNormalize(1n, 2n))).toBe(1);
	});
});

describe("ratSqrtExact", () => {
	it("returns the exact root of a square rational", () => {
		expect(
			rationalToString(rationalSqrtExact(rationalNormalize(4n, 9n))!),
		).toBe("2/3");
	});

	it("returns null when the root is irrational", () => {
		expect(rationalSqrtExact(rationalNormalize(2n))).toBeNull();
	});

	it("rejects a negative operand", () => {
		expect(() => rationalSqrtExact(rationalNormalize(-1n))).toThrow(RangeError);
	});
});

describe("ratToNumber", () => {
	it("approximates small values directly", () => {
		expect(rationalToNumber(rationalNormalize(1n, 4n))).toBe(0.25);
		expect(rationalToNumber(rationalNormalize(-3n, 2n))).toBe(-1.5);
	});

	it("stays finite when both parts overflow binary64", () => {
		const huge = 10n ** 400n;

		expect(
			rationalToNumber({ numerator: huge, denominator: huge, reduced: false }),
		).toBe(1);
		expect(
			rationalToNumber({
				numerator: huge * 3n,
				denominator: huge * 2n,
				reduced: false,
			}),
		).toBeCloseTo(1.5);
	});
});

describe("ratFromNumber", () => {
	it("recovers exact binary fractions", () => {
		expect(rationalToString(rationalFromNumber(0.25))).toBe("1/4");
		expect(rationalToString(rationalFromNumber(-1.5))).toBe("-3/2");
		expect(rationalToString(rationalFromNumber(3))).toBe("3");
	});

	it("respects the denominator bound", () => {
		const approximation = rationalFromNumber(Math.PI, 200n);

		expect(approximation.denominator <= 200n).toBe(true);
		expect(rationalToString(approximation)).toBe("355/113");
	});

	it("rejects non-finite input", () => {
		expect(() => rationalFromNumber(Number.NaN)).toThrow(RangeError);
		expect(() => rationalFromNumber(Number.POSITIVE_INFINITY)).toThrow(
			RangeError,
		);
	});
});

describe("ratIntegralFractional", () => {
	it("splits toward zero", () => {
		const { integral, fractional } = rationalIntegralFractional(
			rationalNormalize(7n, 2n),
		);

		expect(integral).toBe(3n);
		expect(rationalToString(rationalReduce(fractional))).toBe("1/2");
	});

	it("keeps the sign on both parts", () => {
		const { integral, fractional } = rationalIntegralFractional(
			rationalNormalize(-7n, 2n),
		);

		expect(integral).toBe(-3n);
		expect(rationalToString(rationalReduce(fractional))).toBe("-1/2");
	});
});

describe("ℚ as an ordered field", () => {
	it("satisfies every axiom", () => {
		expect(checkOrderedFieldLaws(FIELD, SAMPLES)).toEqual([]);
	});

	it("keeps operands reduced enough that denominators do not explode", () => {
		let sum = RATIONAL_ZERO;

		for (let i = 1n; i <= 40n; i++) {
			sum = rationalAdd(sum, rationalNormalize(1n, i));
		}

		expect(bigIntGcd(sum.numerator, sum.denominator)).toBe(1n);
	});
});
