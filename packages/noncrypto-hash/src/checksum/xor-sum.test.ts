import { describe, expect, it } from "vitest";

import { xorSum } from "./xor-sum.js";

describe("xorSum", () => {
	it("is 0 for empty input", () => {
		expect(xorSum(new Uint8Array(0))).toBe(0);
	});

	it("is the byte itself for a single-byte input", () => {
		expect(xorSum(new Uint8Array([0x5a]))).toBe(0x5a);
	});

	it("cancels an even count of the same byte", () => {
		expect(xorSum(new Uint8Array([0x3c, 0x3c]))).toBe(0);
	});

	it("XORs every byte together in order", () => {
		expect(xorSum(new Uint8Array([0x01, 0x02, 0x04]))).toBe(0x07);
	});
});
