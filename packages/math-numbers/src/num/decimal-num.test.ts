import { describe, expect, it } from "vitest";

import { decimalAbs } from "../decimal/decimal-abs.js";
import { decimalAdd } from "../decimal/decimal-add.js";
import { decimalCompare } from "../decimal/decimal-compare.js";
import { decimalFromString } from "../decimal/decimal-from-string.js";
import { decimalMul } from "../decimal/decimal-mul.js";
import { decimalNeg } from "../decimal/decimal-neg.js";
import { decimalSign } from "../decimal/decimal-sign.js";
import { decimalSub } from "../decimal/decimal-sub.js";
import { decimalToNumber } from "../decimal/decimal-to-number.js";
import { DECIMAL_ZERO, Decimal } from "../decimal/decimal-types.js";

const format = (value: Decimal): string =>
	`${value.coefficient}e${value.exponent}`;

describe("exact arithmetic", () => {
	it("adds without the binary floating-point error", () => {
		const sum = decimalAdd(decimalFromString("0.1"), decimalFromString("0.2"), {
			precision: 0,
			roundingMode: "half-even",
		});

		expect(format(sum)).toBe("3e-1");
		expect(decimalToNumber(sum)).toBe(0.3);
	});

	it("multiplies exactly", () => {
		expect(
			decimalToNumber(
				decimalMul(decimalFromString("1.5"), decimalFromString("2.5"), {
					precision: 0,
					roundingMode: "half-even",
				}),
			),
		).toBe(3.75);
	});

	it("subtracts to exact zero", () => {
		expect(
			decimalSub(decimalFromString("0.3"), decimalFromString("0.3"), {
				precision: 0,
				roundingMode: "half-even",
			}),
		).toBe(DECIMAL_ZERO);
	});
});

describe("order", () => {
	it("compares across differing exponents", () => {
		expect(
			decimalCompare(decimalFromString("0.10"), decimalFromString("0.1")),
		).toBe(0);
		expect(
			decimalCompare(decimalFromString("1.9"), decimalFromString("10")),
		).toBe(-1);
		expect(
			decimalCompare(decimalFromString("-1"), decimalFromString("-2")),
		).toBe(1);
	});

	it("reports sign and absolute value", () => {
		expect(decimalSign(decimalFromString("-3"))).toBe(-1);
		expect(decimalSign(DECIMAL_ZERO)).toBe(0);
		expect(decimalToNumber(decimalAbs(decimalFromString("-3")))).toBe(3);
		expect(decimalToNumber(decimalNeg(decimalFromString("3")))).toBe(-3);
	});

	it("keeps zero canonical under negation", () => {
		expect(decimalNeg(DECIMAL_ZERO)).toBe(DECIMAL_ZERO);
	});
});
