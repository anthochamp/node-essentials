import { describe, expect, it } from "vitest";

import { rotl32 } from "./rotl32.js";
import { rotr32 } from "./rotr32.js";

describe("rotl32", () => {
	it("should move the high bit around to the low bit", () => {
		expect(rotl32(0x80000000, 1)).toBe(0x00000001);
	});

	it("should shift within the word when no wrap occurs", () => {
		expect(rotl32(0x00000001, 4)).toBe(0x00000010);
	});

	it("should return an unsigned value for a negative input", () => {
		expect(rotl32(-1, 7)).toBe(0xffffffff);
	});

	it("should be the identity for a count of zero", () => {
		expect(rotl32(0xdeadbeef, 0)).toBe(0xdeadbeef);
	});

	it("should be the identity for a full turn", () => {
		expect(rotl32(0xdeadbeef, 32)).toBe(0xdeadbeef);
	});

	it("should be the inverse of rotr32", () => {
		expect(rotr32(rotl32(0x12345678, 13), 13)).toBe(0x12345678);
	});
});
