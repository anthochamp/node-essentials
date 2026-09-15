import { describe, expect, it } from "vitest";

import { divEuclid } from "./div-euclid.js";
import { divFloor } from "./div-floor.js";
import { divTrunc } from "./div-trunc.js";
import { modEuclid } from "./mod-euclid.js";
import { mod } from "./mod.js";

const SIGNED_PAIRS: readonly (readonly [number, number])[] = [
	[7, 2],
	[7, -2],
	[-7, 2],
	[-7, -2],
	[6, 3],
	[-6, 3],
	[0, 5],
	[1, -1],
];

describe("mod", () => {
	it("takes the sign of the divisor", () => {
		expect(mod(7, 2)).toBe(1);
		expect(mod(-7, 2)).toBe(1);
		expect(mod(7, -2)).toBe(-1);
		expect(mod(-7, -2)).toBe(-1);
	});

	it("pairs with divFloor for every sign combination", () => {
		for (const [dividend, divisor] of SIGNED_PAIRS) {
			expect(
				divFloor(dividend, divisor) * divisor + mod(dividend, divisor),
			).toBe(dividend);
		}
	});

	it("rejects a zero divisor rather than answering NaN", () => {
		expect(() => mod(1, 0)).toThrow(RangeError);
	});
});

describe("modEuclid", () => {
	it("keeps the remainder in [0, |modulus|)", () => {
		for (const [dividend, divisor] of SIGNED_PAIRS) {
			const remainder = modEuclid(dividend, divisor);

			expect(remainder >= 0).toBe(true);
			expect(remainder < Math.abs(divisor)).toBe(true);
		}
	});

	it("pairs with divEuclid for every sign combination", () => {
		for (const [dividend, divisor] of SIGNED_PAIRS) {
			expect(
				divEuclid(dividend, divisor) * divisor + modEuclid(dividend, divisor),
			).toBe(dividend);
		}
	});

	it("rejects a zero divisor", () => {
		expect(() => modEuclid(1, 0)).toThrow(RangeError);
	});
});

describe("divTrunc / divFloor / divEuclid", () => {
	it("rounds toward zero, negative infinity and the Euclidean quotient", () => {
		expect(divTrunc(-7, 2)).toBe(-3);
		expect(divFloor(-7, 2)).toBe(-4);
		expect(divEuclid(-7, 2)).toBe(-4);

		expect(divTrunc(7, -2)).toBe(-3);
		expect(divFloor(7, -2)).toBe(-4);
		expect(divEuclid(7, -2)).toBe(-3);
	});

	it("pairs with the remainder JavaScript's % already gives", () => {
		for (const [dividend, divisor] of SIGNED_PAIRS) {
			expect(divTrunc(dividend, divisor) * divisor + (dividend % divisor)).toBe(
				dividend,
			);
		}
	});

	it("stays exact at the safe-integer limit", () => {
		expect(divTrunc(Number.MAX_SAFE_INTEGER, 1)).toBe(Number.MAX_SAFE_INTEGER);
		expect(divFloor(Number.MAX_SAFE_INTEGER, 1)).toBe(Number.MAX_SAFE_INTEGER);
	});

	it("rejects a zero divisor", () => {
		expect(() => divTrunc(1, 0)).toThrow(RangeError);
		expect(() => divFloor(1, 0)).toThrow(RangeError);
		expect(() => divEuclid(1, 0)).toThrow(RangeError);
	});
});
