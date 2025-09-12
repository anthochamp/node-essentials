import { describe, expect, it } from "vitest";
import { scale1, scale1Int } from "./scale.js";

describe("scale", () => {
	describe("scale1", () => {
		it("should scale correctly", () => {
			expect(scale1(-0.5, 10, 20)).toBe(5);
			expect(scale1(0, 10, 20)).toBe(10);
			expect(scale1(0.1, 10, 20)).toBe(11);
			expect(scale1(0.5, 10, 20)).toBe(15);
			expect(scale1(0.9999, 10, 20)).toBeCloseTo(19.999, 3);
			expect(scale1(1, 10, 20)).toBe(20);
			expect(scale1(2, 10, 20)).toBe(30);
		});
	});

	describe("scale1Int", () => {
		it("should scale correctly", () => {
			expect(scale1Int(-0.5, 10, 20)).toBe(5);
			expect(scale1Int(0, 10, 20)).toBe(10);
			expect(scale1Int(0.0001, 10, 20)).toBe(10);
			expect(scale1Int(0.5, 10, 20)).toBe(15);
			expect(scale1Int(0.9999, 10, 20)).toBe(20);
			expect(scale1Int(1, 10, 20)).toBe(20);
			expect(scale1Int(2, 10, 20)).toBe(30);
		});

		it("should scale correctly with R number range", () => {
			expect(scale1Int(-0.5, 10.5, 20.5)).toBe(6);
			expect(scale1Int(0, 10.5, 20.5)).toBe(11);
			expect(scale1Int(0.0001, 10.5, 20.5)).toBe(11);
			expect(scale1Int(0.5, 10.5, 20.5)).toBe(16);
			expect(scale1Int(0.9999, 10.5, 20.5)).toBe(20);
			expect(scale1Int(1, 10.5, 20.5)).toBe(21);
			expect(scale1Int(2, 10.5, 20.5)).toBe(31);
		});
	});
});
