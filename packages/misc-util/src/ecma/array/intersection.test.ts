import { describe, expect, it } from "vitest";
import { intersection } from "./intersection.js";

describe("intersection", () => {
	describe("basic functionality", () => {
		it("should return intersection of two arrays with common elements", () => {
			const result = intersection([1, 2, 3], [2, 3, 4]);

			expect(result).toEqual([2, 3]);
		});

		it("should return empty array when arrays have no common elements", () => {
			const result = intersection([1, 2, 3], [4, 5, 6]);

			expect(result).toEqual([]);
		});

		it("should return empty array for empty input arrays", () => {
			const result = intersection([], []);

			expect(result).toEqual([]);
		});

		it("should return empty array when one array is empty", () => {
			const result = intersection([1, 2, 3], []);

			expect(result).toEqual([]);
		});

		it("should handle single array", () => {
			const result = intersection([1, 2, 3]);

			expect(result).toEqual([]);
		});

		it("should return empty array when called with no arguments", () => {
			const result = intersection();

			expect(result).toEqual([]);
		});
	});

	describe("multiple arrays", () => {
		it("should return intersection of three arrays", () => {
			const result = intersection([1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]);

			expect(result).toEqual([3, 4]);
		});

		it("should return intersection of four arrays", () => {
			const result = intersection([1, 2, 3], [2, 3, 4], [3, 4, 5], [3, 5, 6]);

			expect(result).toEqual([3]);
		});

		it("should return empty array if any array is empty", () => {
			const result = intersection([1, 2, 3], [2, 3, 4], [], [3, 4, 5]);

			expect(result).toEqual([]);
		});

		it("should handle many arrays", () => {
			const result = intersection(
				[1, 2, 3, 4, 5],
				[2, 3, 4, 5, 6],
				[3, 4, 5, 6, 7],
				[4, 5, 6, 7, 8],
				[5, 6, 7, 8, 9],
			);

			expect(result).toEqual([5]);
		});
	});

	describe("duplicate handling", () => {
		it("should preserve duplicates from first array", () => {
			const result = intersection([1, 2, 2, 3], [2, 3, 4]);

			expect(result).toEqual([2, 2, 3]);
		});

		it("should handle duplicates in multiple arrays", () => {
			const result = intersection([1, 1, 2, 2, 3], [1, 2, 2, 3], [1, 1, 2]);

			expect(result).toEqual([1, 1, 2, 2]);
		});

		it("should maintain order from first array with duplicates", () => {
			const result = intersection([3, 2, 2, 1], [1, 2, 3]);

			expect(result).toEqual([3, 2, 2, 1]);
		});
	});

	describe("type handling", () => {
		it("should handle string arrays", () => {
			const result = intersection(["a", "b", "c"], ["b", "c", "d"]);

			expect(result).toEqual(["b", "c"]);
		});

		it("should handle boolean arrays", () => {
			const result = intersection([true, false], [false, true]);

			expect(result).toEqual([true, false]);
		});

		it("should handle mixed primitive types", () => {
			const result = intersection([1, "2", true, null], ["2", true, null, 3]);

			expect(result).toEqual(["2", true, null]);
		});

		it("should handle arrays of objects by reference", () => {
			const obj1 = { id: 1 };
			const obj2 = { id: 2 };
			const obj3 = { id: 3 };

			const result = intersection([obj1, obj2, obj3], [obj2, obj3, { id: 4 }]);

			expect(result).toEqual([obj2, obj3]);
		});

		it("should not match objects by value, only by reference", () => {
			const result = intersection(
				[{ id: 1 }, { id: 2 }],
				[{ id: 1 }, { id: 2 }],
			);

			expect(result).toEqual([]);
		});

		it("should handle arrays with undefined values", () => {
			const result = intersection([1, undefined, 3], [undefined, 2, 3]);

			expect(result).toEqual([undefined, 3]);
		});

		it("should handle arrays with null values", () => {
			const result = intersection([1, null, 3], [null, 2, 3]);

			expect(result).toEqual([null, 3]);
		});

		it("should handle NaN values", () => {
			const result = intersection([1, Number.NaN, 3], [Number.NaN, 2, 3]);

			// NaN !== NaN, so NaN will not be in intersection
			expect(result).toEqual([3]);
		});

		it("should handle Symbol values", () => {
			const sym1 = Symbol("test");
			const sym2 = Symbol("test");
			const sym3 = Symbol("other");

			const result = intersection([sym1, sym2], [sym1, sym3]);

			expect(result).toEqual([sym1]);
		});

		it("should handle BigInt values", () => {
			const result = intersection(
				[BigInt(1), BigInt(2), BigInt(3)],
				[BigInt(2), BigInt(3), BigInt(4)],
			);

			// BigInt comparison works by value
			expect(result).toEqual([BigInt(2), BigInt(3)]);
		});
	});

	describe("edge cases", () => {
		it("should handle arrays with zero", () => {
			const result = intersection([0, 1, 2], [0, 2, 3]);

			expect(result).toEqual([0, 2]);
		});

		it("should handle arrays with negative zero", () => {
			const result = intersection([0, -0, 1], [-0, 1, 2]);

			// 0 === -0 in JavaScript
			expect(result).toEqual([0, -0, 1]);
		});

		it("should handle empty strings", () => {
			const result = intersection(["", "a", "b"], ["", "b", "c"]);

			expect(result).toEqual(["", "b"]);
		});

		it("should handle arrays with false and 0", () => {
			const result = intersection([false, 0, 1], [0, false, 2]);

			expect(result).toEqual([false, 0]);
		});

		it("should handle very long arrays", () => {
			const arr1 = Array.from({ length: 10000 }, (_, i) => i);
			const arr2 = Array.from({ length: 10000 }, (_, i) => i + 5000);

			const result = intersection(arr1, arr2);

			expect(result).toHaveLength(5000);
			expect(result[0]).toBe(5000);
			expect(result[4999]).toBe(9999);
		});

		it("should handle nested arrays", () => {
			const arr1 = [1, 2, 3];
			const arr2 = [4, 5, 6];

			const result = intersection([arr1, arr2, 7], [arr1, 8, 9]);

			expect(result).toEqual([arr1]);
			expect(result[0]).toBe(arr1); // Same reference
		});

		it("should handle Date objects by reference", () => {
			const date1 = new Date("2026-01-11");
			const date2 = new Date("2026-01-12");

			const result = intersection(
				[date1, date2],
				[date1, new Date("2026-01-13")],
			);

			expect(result).toEqual([date1]);
		});

		it("should handle RegExp objects by reference", () => {
			const regex1 = /test/g;
			const regex2 = /test/i;

			const result = intersection([regex1, regex2], [regex1, /other/]);

			expect(result).toEqual([regex1]);
		});

		it("should handle functions by reference", () => {
			const fn1 = () => {};
			const fn2 = () => {};

			const result = intersection([fn1, fn2], [fn1, () => {}]);

			expect(result).toEqual([fn1]);
		});

		it("should preserve order from first array", () => {
			const result = intersection([5, 4, 3, 2, 1], [1, 2, 3, 4, 5]);

			expect(result).toEqual([5, 4, 3, 2, 1]);
		});

		it("should handle identical arrays", () => {
			const result = intersection([1, 2, 3], [1, 2, 3]);

			expect(result).toEqual([1, 2, 3]);
		});

		it("should handle single element arrays", () => {
			const result = intersection([1], [1]);

			expect(result).toEqual([1]);
		});

		it("should handle arrays where first array is subset", () => {
			const result = intersection([1, 2], [1, 2, 3, 4, 5]);

			expect(result).toEqual([1, 2]);
		});

		it("should handle arrays where second array is subset", () => {
			const result = intersection([1, 2, 3, 4, 5], [2, 3]);

			expect(result).toEqual([2, 3]);
		});

		it("should handle Map objects by reference", () => {
			const map1 = new Map([["a", 1]]);
			const map2 = new Map([["a", 1]]);

			const result = intersection([map1, map2], [map1]);

			expect(result).toEqual([map1]);
		});

		it("should handle Set objects by reference", () => {
			const set1 = new Set([1, 2]);
			const set2 = new Set([1, 2]);

			const result = intersection([set1, set2], [set1]);

			expect(result).toEqual([set1]);
		});

		it("should handle Error objects by reference", () => {
			const error1 = new Error("test");
			const error2 = new Error("test");

			const result = intersection([error1, error2], [error1]);

			expect(result).toEqual([error1]);
		});

		it("should handle typed arrays by reference", () => {
			const typed1 = new Uint8Array([1, 2, 3]);
			const typed2 = new Uint8Array([1, 2, 3]);

			const result = intersection([typed1, typed2], [typed1]);

			expect(result).toEqual([typed1]);
		});

		it("should handle WeakMap and WeakSet by reference", () => {
			const weak1 = new WeakMap();
			const weak2 = new WeakSet();

			const result = intersection([weak1, weak2], [weak1]);

			expect(result).toEqual([weak1]);
		});
	});

	describe("performance characteristics", () => {
		it("should handle first array with all unique elements", () => {
			const arr1 = [1, 2, 3, 4, 5];
			const arr2 = [6, 7, 8, 9, 10];

			const result = intersection(arr1, arr2);

			expect(result).toEqual([]);
		});

		it("should handle complete overlap", () => {
			const arr = [1, 2, 3, 4, 5];

			const result = intersection(arr, arr, arr);

			expect(result).toEqual(arr);
		});

		it("should handle alternating matches", () => {
			const result = intersection([1, 2, 1, 2, 1, 2], [1, 1, 1]);

			expect(result).toEqual([1, 1, 1]);
		});
	});
});
