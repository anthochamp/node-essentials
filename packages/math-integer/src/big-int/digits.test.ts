import { describe, expect, it } from "vitest";

import { bigIntDigitAt } from "./digit-at.js";
import { bigIntDigitCount } from "./digit-count.js";

describe("bigIntDigitCount", () => {
	it("counts one digit for zero", () => {
		expect(bigIntDigitCount(0n)).toBe(1);
	});

	it("agrees with the rendered numeral in every radix", () => {
		for (const value of [1n, 9n, 10n, 255n, 10n ** 40n, -12345n]) {
			for (const radix of [2, 8, 10, 16, 36]) {
				expect(bigIntDigitCount(value, radix)).toBe(
					(value < 0n ? -value : value).toString(radix).length,
				);
			}
		}
	});

	it("rejects a radix outside [2, 36]", () => {
		expect(() => bigIntDigitCount(1n, 1)).toThrow(RangeError);
		expect(() => bigIntDigitCount(1n, 37)).toThrow(RangeError);
	});
});

describe("bigIntDigitAt", () => {
	it("reads digits from the units up", () => {
		expect(bigIntDigitAt(12345n, 0)).toBe(5);
		expect(bigIntDigitAt(12345n, 1)).toBe(4);
		expect(bigIntDigitAt(12345n, 4)).toBe(1);
	});

	it("answers zero past either end", () => {
		expect(bigIntDigitAt(12345n, 5)).toBe(0);
		expect(bigIntDigitAt(12345n, -1)).toBe(0);
	});

	it("ignores the sign", () => {
		expect(bigIntDigitAt(-12345n, 0)).toBe(5);
	});

	it("reads other radices", () => {
		expect(bigIntDigitAt(0xabcn, 0, 16)).toBe(0xc);
		expect(bigIntDigitAt(0xabcn, 2, 16)).toBe(0xa);
		expect(bigIntDigitAt(0b1010n, 1, 2)).toBe(1);
	});

	it("rejects a non-integer position", () => {
		expect(() => bigIntDigitAt(1n, 0.5)).toThrow(RangeError);
	});
});
