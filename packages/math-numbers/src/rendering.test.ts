// oxlint-disable number-arg-out-of-range -- These are this package's own
// arbitrary-precision types, not `Number.prototype`; going past binary64's
// caps of 20 places and 21 significant digits is exactly what is under test.
import { describe, expect, it } from "vitest";

import { BinaryFp64 } from "./num/binary-fp64.js";
import { BinaryFp128 } from "./num/binary-fp128.js";
import { DecimalNum } from "./num/decimal-num.js";
import { Fraction } from "./num/fraction.js";
import { Integer } from "./num/integer-num.js";

describe("toFixed / toExponential / toPrecision across the tower", () => {
	it("agrees with the language wherever a binary64 can hold the value", () => {
		for (const value of [1234.5678, -1234.5678, 0, 0.000_012_34]) {
			for (const places of [0, 2, 6]) {
				expect(BinaryFp64.from(value).toFixed(places)).toBe(
					value.toFixed(places),
				);
				expect(BinaryFp64.from(value).toExponential(places)).toBe(
					value.toExponential(places),
				);
			}

			for (const digits of [1, 3, 9]) {
				expect(BinaryFp64.from(value).toPrecision(digits)).toBe(
					value.toPrecision(digits),
				);
			}
		}
	});

	it("renders an integer the same way the language would", () => {
		expect(Integer.from(1234n).toFixed(2)).toBe((1234).toFixed(2));
		expect(Integer.from(1234n).toExponential(2)).toBe((1234).toExponential(2));
		expect(Integer.from(1234n).toPrecision(2)).toBe((1234).toPrecision(2));
	});

	it("keeps digits past what a binary64 could hold", () => {
		const huge = Integer.from(10n ** 40n + 7n);

		expect(huge.toFixed(0)).toBe(`${10n ** 40n + 7n}`);
		expect(huge.toPrecision(41)).toBe(`${10n ** 40n + 7n}`);
	});

	it("rounds a repeating fraction where it is asked to stop", () => {
		expect(Fraction.from(1n, 3n).toFixed(5)).toBe("0.33333");
		expect(Fraction.from(2n, 3n).toFixed(5)).toBe("0.66667");
		expect(Fraction.from(1n, 4n).toFixed(5)).toBe("0.25000");
		expect(Fraction.from(1n, 3n).toPrecision(4)).toBe("0.3333");
	});

	it("carries a decimal beyond binary64's reach", () => {
		const long = DecimalNum.from("0.1").divTo(DecimalNum.from(3), 40);

		expect(long.toFixed(40).startsWith("0.03333333333333333333")).toBe(true);
		expect(long.toFixed(40).length).toBe(42);
	});

	it("reaches a binary128 without going through a binary64", () => {
		const third = BinaryFp128.from(1).div(BinaryFp128.from(3));

		expect(third.toFixed(30).startsWith("0.3333333333333333")).toBe(true);
		expect(third.toFixed(30).length).toBe(32);
	});
});

describe("IEEE predicates as free functions", () => {
	it("answer through the class the same way", () => {
		expect(BinaryFp64.from(Number.NaN).isNaN).toBe(true);
		expect(BinaryFp64.from(Number.NaN).isFinite).toBe(false);
		expect(BinaryFp64.from(Number.POSITIVE_INFINITY).isInfinite).toBe(true);
		expect(BinaryFp64.from(0).isFinite).toBe(true);
		expect(BinaryFp128.from(-2).sign()).toBe(-1);
		expect(BinaryFp128.from(0).sign()).toBe(0);
	});
});
