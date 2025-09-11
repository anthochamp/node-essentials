import { describe, expect, it } from "vitest";
import { clamp, clampInt } from "./clamp.js";

describe("clamp", () => {
	describe("clamp", () => {
		it("should clamp within range", () => {
			expect(clamp(5, 0, 10)).toBe(5);
			expect(clamp(0, 0, 10)).toBe(0);
			expect(clamp(10, 0, 10)).toBe(10);
		});

		it("should clamp below range", () => {
			expect(clamp(-5, 0, 10)).toBe(0);
			expect(clamp(-0.1, 0, 10)).toBe(0);
		});

		it("should clamp above range", () => {
			expect(clamp(15, 0, 10)).toBe(10);
			expect(clamp(10.1, 0, 10)).toBe(10);
		});
	});

	describe("clampInt", () => {
		it("should clamp within range", () => {
			expect(clampInt(5, 0, 10)).toBe(5);
			expect(clampInt(0, 0, 10)).toBe(0);
			expect(clampInt(10, 0, 10)).toBe(10);
			expect(clampInt(5.4, 0, 10)).toBe(5);
			expect(clampInt(5.5, 0, 10)).toBe(6);
			expect(clampInt(5.6, 0, 10)).toBe(6);
		});

		it("should clamp below range", () => {
			expect(clampInt(-5, 0, 10)).toBe(0);
			expect(clampInt(-0.1, 0, 10)).toBe(0);
			expect(clampInt(0.4, 0, 10)).toBe(0);
			expect(clampInt(0.5, 0, 10)).toBe(1);
			expect(clampInt(0.6, 0, 10)).toBe(1);
		});

		it("should clamp above range", () => {
			expect(clampInt(15, 0, 10)).toBe(10);
			expect(clampInt(10.1, 0, 10)).toBe(10);
			expect(clampInt(9.4, 0, 10)).toBe(9);
			expect(clampInt(9.5, 0, 10)).toBe(10);
			expect(clampInt(9.6, 0, 10)).toBe(10);
		});
	});
});
