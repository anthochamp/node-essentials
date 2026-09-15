import { describe, expect, it } from "vitest";

import { bigIntSqrt } from "./sqrt.js";

describe("bigIntIsqrt", () => {
	it("returns the floor of the square root", () => {
		expect(bigIntSqrt(0n)).toBe(0n);
		expect(bigIntSqrt(1n)).toBe(1n);
		expect(bigIntSqrt(15n)).toBe(3n);
		expect(bigIntSqrt(16n)).toBe(4n);
		expect(bigIntSqrt(17n)).toBe(4n);
	});

	it("stays exact well past the float range", () => {
		const root = 3n ** 200n;

		expect(bigIntSqrt(root * root)).toBe(root);
		expect(bigIntSqrt(root * root - 1n)).toBe(root - 1n);
	});

	it("rejects negative input", () => {
		expect(() => bigIntSqrt(-1n)).toThrow(RangeError);
	});
});
