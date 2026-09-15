import { describe, expect, it } from "vitest";

import { MASK_64N } from "../../constants/mask.js";
import { clz64 } from "./clz64.js";

describe("clz64", () => {
	it("counts the leading zeros of the low 64 bits", () => {
		expect(clz64(0n)).toBe(64);
		expect(clz64(1n)).toBe(63);
		expect(clz64(0xffn)).toBe(56);
		expect(clz64(MASK_64N)).toBe(0);
	});

	it("agrees with Math.clz32 on 32-bit values", () => {
		for (const value of [1, 2, 3, 255, 0x8000_0000, 0xffff_ffff]) {
			expect(clz64(BigInt(value))).toBe(32 + Math.clz32(value));
		}
	});

	it("ignores bits above the low 64", () => {
		expect(clz64((1n << 70n) | 1n)).toBe(63);
	});
});
