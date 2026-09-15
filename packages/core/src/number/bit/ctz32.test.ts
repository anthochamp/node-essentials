import { describe, expect, it } from "vitest";

import { ctz32 } from "./ctz32.js";

describe("ctz32", () => {
	it("should be 32 for 0, matching Math.clz32(0)", () => {
		expect(ctz32(0)).toBe(32);
	});

	it("should be 0 when the lowest bit is set", () => {
		expect(ctz32(1)).toBe(0);
	});

	it("should count the trailing zeros of a power of two", () => {
		expect(ctz32(8)).toBe(3);
	});

	it("should be 31 when only the highest bit is set", () => {
		expect(ctz32(0x80000000)).toBe(31);
	});
});
