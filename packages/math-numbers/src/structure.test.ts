import {
	APPROXIMATE_ORDERED_FIELD,
	checkEuclideanLaws,
	checkOrderedFieldLaws,
	checkRingLaws,
	INTEGRAL_DOMAIN,
	isField,
	isIntegralDomain,
	isOrderedField,
	isRing,
	ORDERED_FIELD,
} from "@ac-kit/math-algebra";
import { describe, expect, it } from "vitest";

import { BinaryFp64 } from "./num/binary-fp64.js";
import { DecimalNum } from "./num/decimal-num.js";
import { Fraction } from "./num/fraction.js";
import { Integer } from "./num/integer-num.js";

const INTEGER_SAMPLES = [-7n, -2n, -1n, 0n, 1n, 3n, 12n].map((n) =>
	Integer.from(n),
);

const FRACTION_SAMPLES = [
	[-3n, 4n],
	[-1n, 1n],
	[0n, 1n],
	[1n, 3n],
	[2n, 1n],
	[5n, 6n],
].map(([numerator, denominator]) =>
	Fraction.from(numerator as bigint, denominator as bigint),
);

describe("Integer structure", () => {
	it("declares ℤ as an integral domain but not a field", () => {
		expect(Integer.STRUCTURE).toBe(INTEGRAL_DOMAIN);
		expect(isIntegralDomain(Integer.STRUCTURE)).toBe(true);
		expect(isField(Integer.STRUCTURE)).toBe(false);
	});

	it("satisfies the ring axioms", () => {
		expect(checkRingLaws(Integer.ring, INTEGER_SAMPLES)).toEqual([]);
	});

	it("satisfies the Euclidean division property", () => {
		expect(
			checkEuclideanLaws(Integer.euclideanDomain, INTEGER_SAMPLES),
		).toEqual([]);
	});
});

describe("Fraction structure", () => {
	it("declares ℚ as an ordered field", () => {
		expect(Fraction.STRUCTURE).toBe(ORDERED_FIELD);
		expect(isOrderedField(Fraction.STRUCTURE)).toBe(true);
	});

	it("satisfies the ordered field axioms", () => {
		expect(
			checkOrderedFieldLaws(Fraction.orderedField, FRACTION_SAMPLES),
		).toEqual([]);
	});
});

describe("BinaryFp64 structure", () => {
	it("declares floating point as an approximate ordered field", () => {
		expect(BinaryFp64.STRUCTURE).toBe(APPROXIMATE_ORDERED_FIELD);
		expect(isRing(BinaryFp64.STRUCTURE)).toBe(false);
		expect(isField(BinaryFp64.STRUCTURE)).toBe(false);
	});

	it("is not associative, which is why it claims no ring structure", () => {
		const one = BinaryFp64.from(1);
		const big = BinaryFp64.from(1e16);

		// `1 + 1e16` rounds the 1 away, so where the parentheses go decides
		// the answer.
		expect(one.add(big).add(big.neg()).valueOf()).toBe(0);
		expect(one.add(big.add(big.neg())).valueOf()).toBe(1);
	});
});

describe("Decimal structure", () => {
	it("declares decimal floating point as approximate, not a field", () => {
		expect(DecimalNum.STRUCTURE).toBe(APPROXIMATE_ORDERED_FIELD);
		expect(isField(DecimalNum.STRUCTURE)).toBe(false);
	});

	it("is exact under addition, which binary floating point is not", () => {
		expect(DecimalNum.from("0.1").add(DecimalNum.from("0.2")).toString()).toBe(
			"0.3",
		);
		expect(BinaryFp64.from(0.1).add(BinaryFp64.from(0.2)).valueOf()).not.toBe(
			0.3,
		);
	});

	it("rounds where it cannot be exact, which is why it claims no field", () => {
		const third = DecimalNum.from(1).divTo(DecimalNum.from(3), 20);

		expect(third.mul(DecimalNum.from(3)).toString()).not.toBe("1");
		expect(third.decimalPrecision).toBe(20);
	});

	it("computes square roots that square back to the input", () => {
		const root = DecimalNum.from(2).sqrtTo(30);

		// √2 = 1.41421356237309504880168872420969…, so the 30th significant
		// digit rounds up.
		expect(root.toString()).toBe("1.41421356237309504880168872421");
		expect(root.decimalPrecision).toBe(30);
		expect(root.mul(root).roundTo(20).toString()).toBe("2");
	});
});
