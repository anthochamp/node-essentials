import { describe, expect, it } from "vitest";

import { bigIntDivEuclid } from "./div-euclid.js";
import { bigIntDivFloor } from "./div-floor.js";
import { bigIntModEuclid } from "./mod-euclid.js";
import { bigIntMod } from "./mod.js";

const SIGNED_PAIRS: readonly (readonly [bigint, bigint])[] = [
	[7n, 2n],
	[7n, -2n],
	[-7n, 2n],
	[-7n, -2n],
	[6n, 3n],
	[-6n, 3n],
	[0n, 5n],
	[1n, -1n],
];

describe("bigIntMod", () => {
	it("takes the sign of the divisor", () => {
		expect(bigIntMod(7n, 2n)).toBe(1n);
		expect(bigIntMod(-7n, 2n)).toBe(1n);
		expect(bigIntMod(7n, -2n)).toBe(-1n);
		expect(bigIntMod(-7n, -2n)).toBe(-1n);
	});

	it("pairs with bigIntDivFloor for every sign combination", () => {
		for (const [dividend, divisor] of SIGNED_PAIRS) {
			const quotient = bigIntDivFloor(dividend, divisor);

			expect(quotient * divisor + bigIntMod(dividend, divisor)).toBe(dividend);
		}
	});

	it("rejects a zero divisor", () => {
		expect(() => bigIntMod(1n, 0n)).toThrow(RangeError);
	});
});

describe("bigIntModEuclid", () => {
	it("keeps the remainder in [0, |divisor|)", () => {
		for (const [dividend, divisor] of SIGNED_PAIRS) {
			const remainder = bigIntModEuclid(dividend, divisor);
			const magnitude = divisor < 0n ? -divisor : divisor;

			expect(remainder >= 0n).toBe(true);
			expect(remainder < magnitude).toBe(true);
		}
	});

	it("pairs with bigIntDivEuclid for every sign combination", () => {
		for (const [dividend, divisor] of SIGNED_PAIRS) {
			const quotient = bigIntDivEuclid(dividend, divisor);

			expect(quotient * divisor + bigIntModEuclid(dividend, divisor)).toBe(
				dividend,
			);
		}
	});

	it("differs from the floored remainder only on a negative divisor", () => {
		expect(bigIntModEuclid(7n, -2n)).toBe(1n);
		expect(bigIntModEuclid(-7n, -2n)).toBe(1n);
		expect(bigIntModEuclid(-7n, 2n)).toBe(bigIntMod(-7n, 2n));
	});

	it("rejects a zero divisor", () => {
		expect(() => bigIntModEuclid(1n, 0n)).toThrow(RangeError);
		expect(() => bigIntDivEuclid(1n, 0n)).toThrow(RangeError);
	});
});
