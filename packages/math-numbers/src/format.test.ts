import { describe, expect, it } from "vitest";

import { BinaryFp64 } from "./num/binary-fp64.js";
import { BinaryFp128 } from "./num/binary-fp128.js";
import { DecimalNum } from "./num/decimal-num.js";
import { Fraction } from "./num/fraction.js";
import { Integer } from "./num/integer-num.js";

describe("toString — the canonical numeral", () => {
	it("spells specials the way the language does", () => {
		expect(BinaryFp64.from(Number.NaN).toString()).toBe("NaN");
		expect(BinaryFp64.from(Number.POSITIVE_INFINITY).toString()).toBe(
			"Infinity",
		);
		expect(BinaryFp64.from(Number.NEGATIVE_INFINITY).toString()).toBe(
			"-Infinity",
		);
		expect(BinaryFp64.from(-0).toString()).toBe("0");
	});

	it("takes a radix wherever the value is an integer or a binary float", () => {
		expect(Integer.from(255n).toString(16)).toBe("ff");
		expect(Integer.from(-255n).toString(2)).toBe("-11111111");
		expect(BinaryFp64.from(255).toString(16)).toBe("ff");
		expect(Fraction.from(255n, 16n).toString(16)).toBe("ff/10");
	});

	it("keeps a fraction exact rather than expanding it", () => {
		expect(Fraction.from(1n, 3n).toString()).toBe("1/3");
		expect(Fraction.from(6n, 3n).reduce().toString()).toBe("2");
	});

	it("does not lose a binary128 to a binary64 round trip", () => {
		const wide = BinaryFp128.from(1).div(BinaryFp128.from(3));

		expect(wide.toString().length).toBeGreaterThan(String(1 / 3).length);
		expect(wide.toString().startsWith("0.333333333333333")).toBe(true);
	});

	it("backs string coercion", () => {
		expect(`${Integer.from(42n).toString()}`).toBe("42");
		expect(String(Fraction.from(1n, 3n))).toBe("1/3");
		expect(String(DecimalNum.from("0.30"))).toBe("0.3");
	});
});

describe("format — the Intl.NumberFormat wrapper", () => {
	it("passes locales and options straight through", () => {
		expect(Integer.from(1234567n).format("en-US")).toBe("1,234,567");
		expect(Integer.from(1234567n).format("de-DE")).toBe("1.234.567");
		expect(Integer.from(1234567n).format("en-IN")).toBe("12,34,567");
		expect(Integer.from(1234567n).format("en-US", { useGrouping: false })).toBe(
			"1234567",
		);
	});

	it("localizes the special values", () => {
		expect(BinaryFp64.from(Number.POSITIVE_INFINITY).format("en-US")).toBe("∞");
		expect(BinaryFp64.from(Number.NaN).format("en-US")).toBe("NaN");
	});

	it("keeps every digit of a value a number could not hold", () => {
		const big = DecimalNum.from("123456789012345678901234567890.5");

		expect(big.format("en-US", { maximumFractionDigits: 1 })).toBe(
			"123,456,789,012,345,678,901,234,567,890.5",
		);
	});

	it("expands a fraction to a decimal, since Intl has no ratio notation", () => {
		expect(Fraction.from(1n, 4n).format("en-US")).toBe("0.25");
		expect(Fraction.from(1n, 3n).format("en-US")).toBe("0.333");
		expect(
			Fraction.from(1n, 3n).format("en-US", { maximumFractionDigits: 10 }),
		).toBe("0.3333333333");
		expect(Fraction.from(-2n, 3n).format("en-US")).toBe("-0.667");
	});

	it("rounds a fraction the way the exact value would, not the truncation", () => {
		// 1/8 is 0.125 exactly, so an even tie rounds down to 0.12.
		expect(
			Fraction.from(1n, 8n).format("en-US", {
				maximumFractionDigits: 2,
				roundingMode: "halfEven",
			}),
		).toBe("0.12");

		// 41/320 is 0.128125, just above the 0.128 tie, so it must round up.
		expect(
			Fraction.from(41n, 320n).format("en-US", {
				maximumFractionDigits: 3,
				roundingMode: "halfEven",
			}),
		).toBe("0.128");
	});
});

describe("precision queries over a fraction", () => {
	it("reports a terminating expansion as finite", () => {
		expect(Fraction.from(1n, 4n).fractionalPrecision).toBe(2);
		expect(Fraction.from(1n, 4n).decimalPrecision).toBe(2);
		expect(Fraction.from(1n, 8n).fractionalPrecision).toBe(3);
		expect(Fraction.from(3n, 50n).fractionalPrecision).toBe(2);
	});

	it("reports a repeating expansion as infinite", () => {
		expect(Fraction.from(1n, 3n).fractionalPrecision).toBe(
			Number.POSITIVE_INFINITY,
		);
		expect(Fraction.from(1n, 6n).decimalPrecision).toBe(
			Number.POSITIVE_INFINITY,
		);
	});

	it("reduces before deciding, so 2/6 is 1/3 and 2/4 is 1/2", () => {
		expect(Fraction.from(2n, 4n).fractionalPrecision).toBe(1);
		expect(Fraction.from(2n, 6n).fractionalPrecision).toBe(
			Number.POSITIVE_INFINITY,
		);
	});
});
