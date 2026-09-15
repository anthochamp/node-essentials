import { describe, expect, it } from "vitest";

import {
	buildGf2PolynomialTable,
	gf2ModPow,
	gf2MulMod,
	stepGf2Polynomial,
} from "./_gf2-polynomial.js";

describe("buildGf2PolynomialTable / stepGf2Polynomial", () => {
	it('reproduces the CRC-16/XMODEM check value for "123456789"', () => {
		// width=16, polynomial=0x1021, init=0, refIn=refOut=false, xorOut=0 —
		// https://reveng.sourceforge.io/crc-catalogue/all.htm, check=0x31C3.
		const polynomial = 0x1021n;
		const width = 16;
		const table = buildGf2PolynomialTable(polynomial, width);
		const data = new TextEncoder().encode("123456789");

		let register = 0n;

		for (const byte of data) {
			register = stepGf2Polynomial(register, byte, table, width);
		}

		expect(register).toBe(0x31c3n);
	});
});

describe("gf2MulMod / gf2ModPow", () => {
	// x^width mod P(x) == polynomial, since P(x) = x^width + polynomial (its
	// implicit top bit) and GF(2) subtraction is XOR: x^width - P(x) =
	// -polynomial = polynomial. Holds for any MSB-first CRC polynomial.
	it("computes x^width mod P == polynomial for CRC-16/XMODEM", () => {
		const polynomial = 0x1021n;

		expect(gf2ModPow(2n, 16n, polynomial, 16)).toBe(polynomial);
	});

	it("computes x^width mod P == polynomial for CRC-32/ISO-HDLC", () => {
		const polynomial = 0x04c11db7n;

		expect(gf2ModPow(2n, 32n, polynomial, 32)).toBe(polynomial);
	});

	it("has 1 as the multiplicative identity", () => {
		const polynomial = 0x1021n;
		const value = 0x1357n;

		expect(gf2MulMod(value, 1n, polynomial, 16)).toBe(value);
	});

	it("gf2ModPow with exponent 0 returns 1", () => {
		expect(gf2ModPow(0x1357n, 0n, 0x1021n, 16)).toBe(1n);
	});

	it("gf2ModPow with exponent 1 returns the base reduced mod P", () => {
		const polynomial = 0x1021n;
		const base = 0x1357n;

		expect(gf2ModPow(base, 1n, polynomial, 16)).toBe(
			gf2MulMod(1n, base, polynomial, 16),
		);
	});
});
