import { describe, expect, it } from "vitest";

import { rotr32 } from "./rotr32.js";

describe("rotr32", () => {
	it("should move the low bit around to the high bit", () => {
		expect(rotr32(0x00000001, 1)).toBe(0x80000000);
	});

	it("should shift within the word when no wrap occurs", () => {
		expect(rotr32(0x00000010, 4)).toBe(0x00000001);
	});

	it("should be the identity for a count of zero", () => {
		expect(rotr32(0xdeadbeef, 0)).toBe(0xdeadbeef);
	});

	it("should be the identity for a full turn", () => {
		expect(rotr32(0xdeadbeef, 32)).toBe(0xdeadbeef);
	});
});
