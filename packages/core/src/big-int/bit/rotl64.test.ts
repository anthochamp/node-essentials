import { describe, expect, it } from "vitest";

import { MASK_64N } from "../../constants/mask.js";
import { rotl64 } from "./rotl64.js";
import { rotr64 } from "./rotr64.js";

describe("rotl64", () => {
	it("should move the high bit around to the low bit", () => {
		expect(rotl64(0x8000000000000000n, 1n)).toBe(0x0000000000000001n);
	});

	it("should shift within the word when no wrap occurs", () => {
		expect(rotl64(0x0000000000000001n, 4n)).toBe(0x0000000000000010n);
	});

	it("should mask the result to 64 bits", () => {
		expect(rotl64(MASK_64N, 17n)).toBe(MASK_64N);
	});

	it("should be the identity for a count of zero", () => {
		expect(rotl64(0x0123456789abcdefn, 0n)).toBe(0x0123456789abcdefn);
	});

	it("should be the identity for a full turn", () => {
		expect(rotl64(0x0123456789abcdefn, 64n)).toBe(0x0123456789abcdefn);
	});

	it("should be the inverse of rotr64", () => {
		expect(rotr64(rotl64(0x0123456789abcdefn, 29n), 29n)).toBe(
			0x0123456789abcdefn,
		);
	});
});
