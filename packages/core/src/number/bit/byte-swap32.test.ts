import { describe, expect, it } from "vitest";

import { byteSwap32 } from "./byte-swap32.js";

describe("byteSwap32", () => {
	it("should reverse the byte order", () => {
		expect(byteSwap32(0x12345678)).toBe(0x78563412);
	});

	it("should be its own inverse", () => {
		expect(byteSwap32(byteSwap32(0x12345678))).toBe(0x12345678);
	});
});
