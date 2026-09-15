import { describe, expect, it } from "vitest";

import { bitLength } from "./bit-length.js";
import { ilog2 } from "./ilog2.js";
import { ipow } from "./ipow.js";
import { isqrt } from "./isqrt.js";
import { sqrtExact } from "./sqrt-exact.js";

describe("bitLength", () => {
	it("counts the bits of the magnitude", () => {
		expect(bitLength(0)).toBe(0);
		expect(bitLength(1)).toBe(1);
		expect(bitLength(255)).toBe(8);
		expect(bitLength(256)).toBe(9);
		expect(bitLength(-255)).toBe(8);
	});

	it("keeps counting above 32 bits", () => {
		expect(bitLength(0xffff_ffff)).toBe(32);
		expect(bitLength(2 ** 32)).toBe(33);
		expect(bitLength(2 ** 52)).toBe(53);
		expect(bitLength(Number.MAX_SAFE_INTEGER)).toBe(53);
	});
});

describe("ilog2", () => {
	it("floors the base-2 logarithm", () => {
		expect(ilog2(1)).toBe(0);
		expect(ilog2(2)).toBe(1);
		expect(ilog2(3)).toBe(1);
		expect(ilog2(2 ** 40)).toBe(40);
		expect(ilog2(2 ** 40 - 1)).toBe(39);
	});

	it("rejects a non-positive value", () => {
		expect(() => ilog2(0)).toThrow(RangeError);
		expect(() => ilog2(-1)).toThrow(RangeError);
	});
});

describe("ipow", () => {
	it("computes exact integer powers", () => {
		expect(ipow(2, 10)).toBe(1024);
		expect(ipow(3, 5)).toBe(243);
		expect(ipow(-2, 3)).toBe(-8);
		expect(ipow(-2, 4)).toBe(16);
		expect(ipow(7, 0)).toBe(1);
		expect(ipow(0, 0)).toBe(1);
	});

	it("reports overflow past the safe-integer range", () => {
		expect(ipow(2, 53)).toBeNull();
		expect(ipow(10, 30)).toBeNull();
	});

	it("rejects non-integer or negative input", () => {
		expect(() => ipow(1.5, 2)).toThrow(RangeError);
		expect(() => ipow(2, -1)).toThrow(RangeError);
		expect(() => ipow(2, 1.5)).toThrow(RangeError);
	});
});

describe("isqrt", () => {
	it("floors the square root", () => {
		expect(isqrt(0)).toBe(0);
		expect(isqrt(1)).toBe(1);
		expect(isqrt(15)).toBe(3);
		expect(isqrt(16)).toBe(4);
		expect(isqrt(17)).toBe(4);
	});

	it("stays exact for large perfect squares", () => {
		for (const root of [3, 1000, 94906265]) {
			const square = root * root;

			if (Number.isSafeInteger(square)) {
				expect(isqrt(square)).toBe(root);
				expect(isqrt(square - 1)).toBe(root - 1);
			}
		}
	});

	it("rejects a negative or unsafe value", () => {
		expect(() => isqrt(-1)).toThrow(RangeError);
		expect(() => isqrt(2 ** 53)).toThrow(RangeError);
	});
});

describe("sqrtExact", () => {
	it("answers the root only for a perfect square", () => {
		expect(sqrtExact(16)).toBe(4);
		expect(sqrtExact(17)).toBeNull();
		expect(sqrtExact(0)).toBe(0);
		expect(sqrtExact(1000 ** 2)).toBe(1000);
	});
});
