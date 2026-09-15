import { describe, expect, it } from "vitest";

import { bitsToFloat16, float16ToBits } from "./float16-bits.js";
import { bitsToFloat32, float32ToBits } from "./float32-bits.js";
import { bitsToFloat64, float64ToBits } from "./float64-bits.js";

describe("float64ToBits / bitsToFloat64", () => {
	it("maps known patterns", () => {
		expect(float64ToBits(1)).toBe(0x3ff0000000000000n);
		expect(float64ToBits(-2)).toBe(0xc000000000000000n);
		expect(float64ToBits(0)).toBe(0n);
		expect(float64ToBits(-0)).toBe(0x8000000000000000n);
		expect(float64ToBits(Number.POSITIVE_INFINITY)).toBe(0x7ff0000000000000n);
	});

	it("round-trips every finite magnitude", () => {
		for (const value of [
			1,
			-1,
			0.1,
			Number.MIN_VALUE,
			Number.MAX_VALUE,
			Math.PI,
		]) {
			expect(bitsToFloat64(float64ToBits(value))).toBe(value);
		}
	});

	it("round-trips the zeros with their sign", () => {
		expect(Object.is(bitsToFloat64(float64ToBits(-0)), -0)).toBe(true);
		expect(Object.is(bitsToFloat64(float64ToBits(0)), 0)).toBe(true);
	});

	it("round-trips NaN", () => {
		expect(bitsToFloat64(float64ToBits(Number.NaN))).toBeNaN();
	});
});

describe("float32ToBits / bitsToFloat32", () => {
	it("maps known patterns", () => {
		expect(float32ToBits(1)).toBe(0x3f800000);
		expect(float32ToBits(-2)).toBe(0xc0000000);
		expect(float32ToBits(0)).toBe(0);
	});

	it("rounds to binary32 first, like Math.fround", () => {
		expect(bitsToFloat32(float32ToBits(0.1))).toBe(Math.fround(0.1));
	});

	it("round-trips a value already representable in binary32", () => {
		for (const value of [1, -1, 0.5, 0.25, Math.fround(Math.PI)]) {
			expect(bitsToFloat32(float32ToBits(value))).toBe(value);
		}
	});
});

describe("float16ToBits / bitsToFloat16", () => {
	it("maps known patterns", () => {
		expect(float16ToBits(1)).toBe(0x3c00);
		expect(float16ToBits(-2)).toBe(0xc000);
		expect(float16ToBits(0)).toBe(0);
	});

	it("rounds to binary16 first, like Math.f16round", () => {
		expect(bitsToFloat16(float16ToBits(0.1))).toBe(Math.f16round(0.1));
	});

	it("round-trips a value already representable in binary16", () => {
		for (const value of [1, -1, 0.5, 0.25, 2048]) {
			expect(bitsToFloat16(float16ToBits(value))).toBe(value);
		}
	});
});
