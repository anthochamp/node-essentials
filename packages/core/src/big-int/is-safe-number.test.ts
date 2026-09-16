import { describe, expect, it } from "vitest";

import { bigIntIsSafeNumber } from "./is-safe-number.js";

describe("bigIntIsSafeNumber", () => {
	it("should accept the safe-integer range inclusive", () => {
		expect(bigIntIsSafeNumber(0n)).toBe(true);
		expect(bigIntIsSafeNumber(9007199254740991n)).toBe(true);
		expect(bigIntIsSafeNumber(-9007199254740991n)).toBe(true);
	});

	it("should reject the first value past either end", () => {
		expect(bigIntIsSafeNumber(9007199254740992n)).toBe(false);
		expect(bigIntIsSafeNumber(-9007199254740992n)).toBe(false);
	});

	it("should agree with Number.isSafeInteger on the round-trip", () => {
		for (const value of [0n, 1n, -1n, 9007199254740991n, 9007199254740992n]) {
			expect(bigIntIsSafeNumber(value)).toBe(
				Number.isSafeInteger(Number(value)) && BigInt(Number(value)) === value,
			);
		}
	});
});
