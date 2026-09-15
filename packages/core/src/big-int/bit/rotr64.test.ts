import { describe, expect, it } from "vitest";

import { rotr64 } from "./rotr64.js";

describe("rotr64", () => {
	it("should move the low bit around to the high bit", () => {
		expect(rotr64(0x0000000000000001n, 1n)).toBe(0x8000000000000000n);
	});

	it("should shift within the word when no wrap occurs", () => {
		expect(rotr64(0x0000000000000010n, 4n)).toBe(0x0000000000000001n);
	});

	it("should be the identity for a count of zero", () => {
		expect(rotr64(0x0123456789abcdefn, 0n)).toBe(0x0123456789abcdefn);
	});

	it("should be the identity for a full turn", () => {
		expect(rotr64(0x0123456789abcdefn, 64n)).toBe(0x0123456789abcdefn);
	});
});
