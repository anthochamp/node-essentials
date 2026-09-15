import { describe, expect, it } from "vitest";

import { bytesForBits } from "./bytes-for-bits.js";

describe("bytesForBits", () => {
	it("should be 0 for 0 bits", () => {
		expect(bytesForBits(0)).toBe(0);
	});

	it("should not round up an exact multiple of 8", () => {
		expect(bytesForBits(8)).toBe(1);
		expect(bytesForBits(16)).toBe(2);
	});

	it("should round up a partial trailing byte", () => {
		expect(bytesForBits(1)).toBe(1);
		expect(bytesForBits(9)).toBe(2);
		expect(bytesForBits(17)).toBe(3);
	});
});
