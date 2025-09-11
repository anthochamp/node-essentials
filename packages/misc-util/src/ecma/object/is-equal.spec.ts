import { describe, expect, it } from "vitest";
import { isEqual } from "./is-equal.js";

describe("isEqual", () => {
	describe("strict mode", () => {
		it("should return true for identical primitive values", () => {
			expect(isEqual(42, 42)).toBe(true);
			expect(isEqual("hello", "hello")).toBe(true);
			expect(isEqual(true, true)).toBe(true);
			expect(isEqual(null, null)).toBe(true);
			expect(isEqual(undefined, undefined)).toBe(true);
		});

		it("should return false for different primitive values", () => {
			expect(isEqual(42, 43)).toBe(false);
			expect(isEqual("hello", "world")).toBe(false);
			expect(isEqual(true, false)).toBe(false);
			expect(isEqual(null, undefined)).toBe(false);
		});

		it("should return false for identical objects with different reference", () => {
			expect(isEqual({ a: 1 }, { a: 1 })).toBe(false);
			expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(false);
			expect(isEqual(new Date("2023-01-01"), new Date("2023-01-01"))).toBe(
				false,
			);
		});

		it("should return true for same objects reference", () => {
			const obj = { a: 1 };
			expect(isEqual(obj, obj)).toBe(true);

			const arr = [1, 2, 3];
			expect(isEqual(arr, arr)).toBe(true);

			const date = new Date("2023-01-01");
			expect(isEqual(date, date)).toBe(true);
		});
	});

	describe("loose mode", () => {
		it("should return true for loosely equal primitive values", () => {
			expect(isEqual(42, "42", "loose")).toBe(true);
			expect(isEqual(true, 1, "loose")).toBe(true);
			expect(isEqual(false, 0, "loose")).toBe(true);
			expect(isEqual(null, undefined, "loose")).toBe(true);
		});

		it("should return false for non-loosely equal primitive values", () => {
			expect(isEqual(42, "43", "loose")).toBe(false);
			expect(isEqual(true, 0, "loose")).toBe(false);
			expect(isEqual(false, 1, "loose")).toBe(false);
		});
	});

	describe("sameValue mode", () => {
		it("should return true for same value comparisons", () => {
			expect(isEqual(NaN, NaN, "sameValue")).toBe(true);
			expect(isEqual(42, 42, "sameValue")).toBe(true);
			expect(isEqual("hello", "hello", "sameValue")).toBe(true);
		});

		it("should return false for different value comparisons", () => {
			expect(isEqual(0, -0, "sameValue")).toBe(false);
			expect(isEqual(-0, 0, "sameValue")).toBe(false);
			expect(isEqual(42, "42", "sameValue")).toBe(false);
			expect(isEqual(true, 1, "sameValue")).toBe(false);
			expect(isEqual(null, undefined, "sameValue")).toBe(false);
		});
	});

	describe("sameValueZero mode", () => {
		it("should return true for same value zero comparisons", () => {
			expect(isEqual(NaN, NaN, "sameValueZero")).toBe(true);
			expect(isEqual(0, -0, "sameValueZero")).toBe(true);
			expect(isEqual(-0, 0, "sameValueZero")).toBe(true);
			expect(isEqual(42, 42, "sameValueZero")).toBe(true);
			expect(isEqual("hello", "hello", "sameValueZero")).toBe(true);
		});

		it("should return false for different value comparisons", () => {
			expect(isEqual(42, "42", "sameValueZero")).toBe(false);
			expect(isEqual(true, 1, "sameValueZero")).toBe(false);
			expect(isEqual(null, undefined, "sameValueZero")).toBe(false);
		});
	});

	describe("custom predicate", () => {
		const customPredicate = (a: unknown, b: unknown) => {
			if (typeof a === "string" && typeof b === "string") {
				return a.toLowerCase() === b.toLowerCase();
			}
			return a === b;
		};

		it("should return true for values considered equal by the custom predicate", () => {
			expect(isEqual("hello", "HELLO", customPredicate)).toBe(true);
			expect(isEqual(42, 42, customPredicate)).toBe(true);
		});

		it("should return false for values not considered equal by the custom predicate", () => {
			expect(isEqual("hello", "world", customPredicate)).toBe(false);
			expect(isEqual(42, 43, customPredicate)).toBe(false);
		});
	});

	it("should throw for unimplemented strategies", () => {
		expect(() => isEqual(1, 1, "unknown" as any)).toThrow("strategy unknown");
	});
});
