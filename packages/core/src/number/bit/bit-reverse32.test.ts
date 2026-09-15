import { describe, expect, it } from "vitest";

import { MASK_32 } from "../../constants/mask.js";
import { bitReverse32 } from "./bit-reverse32.js";

describe("bitReverse32", () => {
	it("should move the lowest bit to the highest position", () => {
		expect(bitReverse32(1)).toBe(0x80000000);
	});

	it("should leave 0 unchanged", () => {
		expect(bitReverse32(0)).toBe(0);
	});

	it("should leave all-ones unchanged", () => {
		expect(bitReverse32(MASK_32)).toBe(MASK_32);
	});

	it("should be its own inverse", () => {
		expect(bitReverse32(bitReverse32(0x12345678))).toBe(0x12345678);
	});
});
