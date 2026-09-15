import { describe, expect, it } from "vitest";

import { bitReverse64 } from "./bit-reverse64.js";

describe("bitReverse64", () => {
	it("should move the lowest bit to the highest position", () => {
		expect(bitReverse64(1n)).toBe(0x8000000000000000n);
	});

	it("should be its own inverse", () => {
		expect(bitReverse64(bitReverse64(0x123456789abcdef0n))).toBe(
			0x123456789abcdef0n,
		);
	});
});
