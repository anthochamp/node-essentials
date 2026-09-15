import { ComparatorResult, compareNaturalAscending } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { isInSortedIntervals } from "./is-in-sorted-intervals.js";

suite("isInSortedIntervals", () => {
	test("returns false for an empty range list", () => {
		expect(isInSortedIntervals([], 5, compareNaturalAscending)).toBe(false);
	});

	test("finds a value inside a single range", () => {
		expect(isInSortedIntervals([10, 20], 15, compareNaturalAscending)).toBe(
			true,
		);
	});

	test("includes both inclusive bounds", () => {
		expect(isInSortedIntervals([10, 20], 10, compareNaturalAscending)).toBe(
			true,
		);
		expect(isInSortedIntervals([10, 20], 20, compareNaturalAscending)).toBe(
			true,
		);
	});

	test("returns false just outside a range", () => {
		expect(isInSortedIntervals([10, 20], 9, compareNaturalAscending)).toBe(
			false,
		);
		expect(isInSortedIntervals([10, 20], 21, compareNaturalAscending)).toBe(
			false,
		);
	});

	test("finds a value in the first, middle, or last of several ranges", () => {
		const ranges = [0, 5, 10, 15, 20, 25, 30, 35];

		expect(isInSortedIntervals(ranges, 2, compareNaturalAscending)).toBe(true);
		expect(isInSortedIntervals(ranges, 12, compareNaturalAscending)).toBe(true);
		expect(isInSortedIntervals(ranges, 33, compareNaturalAscending)).toBe(true);
	});

	test("returns false for a value in a gap between ranges", () => {
		const ranges = [0, 5, 10, 15, 20, 25];

		expect(isInSortedIntervals(ranges, 7, compareNaturalAscending)).toBe(false);
		expect(isInSortedIntervals(ranges, 17, compareNaturalAscending)).toBe(
			false,
		);
	});

	test("handles a single-value range (start === end)", () => {
		expect(isInSortedIntervals([42, 42], 42, compareNaturalAscending)).toBe(
			true,
		);
		expect(isInSortedIntervals([42, 42], 41, compareNaturalAscending)).toBe(
			false,
		);
	});

	test("supports a non-numeric type via a custom comparator", () => {
		const ranges = [new Date(2020, 0, 1), new Date(2020, 11, 31)];
		const byTime: (a: Date, b: Date) => ComparatorResult = (a, b) =>
			compareNaturalAscending(a.getTime(), b.getTime());

		expect(isInSortedIntervals(ranges, new Date(2020, 5, 15), byTime)).toBe(
			true,
		);
		expect(isInSortedIntervals(ranges, new Date(2021, 0, 1), byTime)).toBe(
			false,
		);
	});
});
