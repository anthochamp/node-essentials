import { describe, expect, it } from "vitest";

import { byteSwap64 } from "./byte-swap64.js";

describe("byteSwap64", () => {
	it("should reverse the byte order", () => {
		expect(byteSwap64(0x0102030405060708n)).toBe(0x0807060504030201n);
	});

	it("should be its own inverse", () => {
		expect(byteSwap64(byteSwap64(0x123456789abcdef0n))).toBe(
			0x123456789abcdef0n,
		);
	});
});
