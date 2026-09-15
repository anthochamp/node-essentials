import { describe, expect, it } from "vitest";

import { ctz64 } from "./ctz64.js";

describe("ctz64", () => {
	it("should be 64 for 0n", () => {
		expect(ctz64(0n)).toBe(64);
	});

	it("should be 0 when the lowest bit is set", () => {
		expect(ctz64(1n)).toBe(0);
	});

	it("should be 63 when only the highest bit is set", () => {
		expect(ctz64(0x8000000000000000n)).toBe(63);
	});
});
