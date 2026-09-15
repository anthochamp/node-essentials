import { describe, expect, it } from "vitest";

import { bigIntBitLength } from "./bit-length.js";

describe("bigIntBitLength", () => {
	it("counts the bits of the magnitude", () => {
		expect(bigIntBitLength(0n)).toBe(0);
		expect(bigIntBitLength(1n)).toBe(1);
		expect(bigIntBitLength(255n)).toBe(8);
		expect(bigIntBitLength(256n)).toBe(9);
		expect(bigIntBitLength(-256n)).toBe(9);
		expect(bigIntBitLength(1n << 200n)).toBe(201);
	});
});
