import { identity } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { radixSort } from "./radix-sort.js";

describe("radixSort", () => {
	it("should sort an array of non-negative integers ascending", () => {
		const values = [170, 45, 75, 90, 802, 24, 2, 66];
		expect(radixSort(values, identity)).toEqual(
			values.toSorted((a, b) => a - b),
		);
	});

	it("should sort by a derived key", () => {
		const items = [{ n: 3 }, { n: 1 }, { n: 2 }];
		expect(radixSort(items, (item) => item.n)).toEqual([
			{ n: 1 },
			{ n: 2 },
			{ n: 3 },
		]);
	});

	it("should be stable for equal keys", () => {
		const items = [
			{ key: 1, tag: "a" },
			{ key: 1, tag: "b" },
			{ key: 0, tag: "c" },
			{ key: 1, tag: "d" },
		];
		expect(radixSort(items, (item) => item.key)).toEqual([
			{ key: 0, tag: "c" },
			{ key: 1, tag: "a" },
			{ key: 1, tag: "b" },
			{ key: 1, tag: "d" },
		]);
	});

	it("should not modify the input array", () => {
		const values = [3, 1, 2];
		const result = radixSort(values, identity);
		expect(values).toEqual([3, 1, 2]);
		expect(result).not.toBe(values);
	});

	it("should handle empty and single-element arrays", () => {
		expect(radixSort([], identity)).toEqual([]);
		expect(radixSort([7], identity)).toEqual([7]);
	});

	it("should handle keys spanning multiple 8-bit digits", () => {
		const values = [70000, 1, 4294967295, 256, 65536];
		expect(radixSort(values, identity)).toEqual(
			values.toSorted((a, b) => a - b),
		);
	});

	it("should throw a RangeError for negative keys", () => {
		expect(() => radixSort([1, -2, 3], identity)).toThrow(RangeError);
	});

	it("should throw a RangeError for non-integer keys", () => {
		expect(() => radixSort([1, 2.5, 3], identity)).toThrow(RangeError);
	});
});
