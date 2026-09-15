import { describe, expect, it } from "vitest";

import { bigIntAbs } from "./abs.js";
import { bigIntClamp } from "./clamp.js";
import { bigIntLog2 } from "./log2.js";
import { bigIntMax, bigIntMin } from "./min-max.js";
import { bigIntSign } from "./sign.js";

describe("bigIntAbs", () => {
	it("drops the sign", () => {
		expect(bigIntAbs(-7n)).toBe(7n);
		expect(bigIntAbs(7n)).toBe(7n);
		expect(bigIntAbs(0n)).toBe(0n);
	});
});

describe("bigIntSign", () => {
	it("reports the three-way sign", () => {
		expect(bigIntSign(-7n)).toBe(-1);
		expect(bigIntSign(0n)).toBe(0);
		expect(bigIntSign(7n)).toBe(1);
	});
});

describe("bigIntMin / bigIntMax", () => {
	it("accepts separate arguments", () => {
		expect(bigIntMin(3n, -1n, 7n)).toBe(-1n);
		expect(bigIntMax(3n, -1n, 7n)).toBe(7n);
	});

	it("accepts an array", () => {
		expect(bigIntMin([3n, -1n, 7n])).toBe(-1n);
		expect(bigIntMax([3n, -1n, 7n])).toBe(7n);
	});

	it("compares numerically past the safe-integer range", () => {
		const big = 2n ** 70n;

		expect(bigIntMax(big, big + 1n)).toBe(big + 1n);
	});

	it("rejects an empty list", () => {
		expect(() => bigIntMin([])).toThrow(RangeError);
		expect(() => bigIntMax([])).toThrow(RangeError);
	});
});

describe("bigIntClamp", () => {
	it("bounds the value on both sides", () => {
		expect(bigIntClamp(5n, 0n, 10n)).toBe(5n);
		expect(bigIntClamp(-5n, 0n, 10n)).toBe(0n);
		expect(bigIntClamp(50n, 0n, 10n)).toBe(10n);
	});

	it("rejects an inverted range", () => {
		expect(() => bigIntClamp(1n, 10n, 0n)).toThrow(RangeError);
	});
});

describe("bigIntLog2", () => {
	it("floors the base-2 logarithm", () => {
		expect(bigIntLog2(1n)).toBe(0);
		expect(bigIntLog2(2n)).toBe(1);
		expect(bigIntLog2(3n)).toBe(1);
		expect(bigIntLog2(255n)).toBe(7);
		expect(bigIntLog2(256n)).toBe(8);
	});

	it("stays exact where Math.log2 rounds", () => {
		expect(bigIntLog2(2n ** 200n)).toBe(200);
		expect(bigIntLog2(2n ** 200n - 1n)).toBe(199);
	});

	it("rejects a non-positive value", () => {
		expect(() => bigIntLog2(0n)).toThrow(RangeError);
		expect(() => bigIntLog2(-1n)).toThrow(RangeError);
	});
});
