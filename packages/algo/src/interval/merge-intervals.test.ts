import { compareNaturalAscending } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { isInSortedIntervals } from "./is-in-sorted-intervals.js";
import { mergeIntervals } from "./merge-intervals.js";

/** Integer successor, the adjacency a `number` bound usually wants. */
const nextInteger = (end: number, nextStart: number): boolean =>
	nextStart === end + 1;

/**
 * Brute force over a bounded integer universe: mark every covered point, then
 * read the runs back. Independent of the sweep under test.
 */
function coverByMarking(
	intervals: readonly number[],
	universe: number,
): number[] {
	const covered = Array.from({ length: universe }, () => false);

	for (let pair = 0; pair * 2 < intervals.length; pair++) {
		for (
			let value = intervals[pair * 2]!;
			value <= intervals[pair * 2 + 1]!;
			value++
		) {
			covered[value] = true;
		}
	}

	const runs: number[] = [];

	for (let value = 0; value < universe; value++) {
		if (!covered[value]) {
			continue;
		}

		const start = value;
		while (covered[value + 1] === true) {
			value += 1;
		}
		runs.push(start, value);
	}

	return runs;
}

suite("mergeIntervals", () => {
	test("returns nothing for no intervals", () => {
		expect(mergeIntervals([], compareNaturalAscending)).toStrictEqual([]);
	});

	test("rejects an odd number of bounds", () => {
		expect(() => mergeIntervals([1, 2, 3], compareNaturalAscending)).toThrow(
			RangeError,
		);
	});

	test("sorts intervals that arrive out of order", () => {
		expect(
			mergeIntervals([10, 12, 1, 3, 5, 7], compareNaturalAscending),
		).toStrictEqual([1, 3, 5, 7, 10, 12]);
	});

	test("merges overlapping intervals", () => {
		expect(mergeIntervals([1, 5, 3, 9], compareNaturalAscending)).toStrictEqual(
			[1, 9],
		);
	});

	test("merges intervals touching at a point, with no adjacency test", () => {
		expect(mergeIntervals([1, 5, 5, 9], compareNaturalAscending)).toStrictEqual(
			[1, 9],
		);
	});

	test("keeps an interval nested inside another from shrinking it", () => {
		expect(mergeIntervals([1, 9, 3, 4], compareNaturalAscending)).toStrictEqual(
			[1, 9],
		);
	});

	test("leaves a gap of one between intervals when adjacency is not given", () => {
		expect(mergeIntervals([1, 2, 3, 4], compareNaturalAscending)).toStrictEqual(
			[1, 2, 3, 4],
		);
	});

	test("coalesces that same gap once adjacency is given", () => {
		expect(
			mergeIntervals([1, 2, 3, 4], compareNaturalAscending, nextInteger),
		).toStrictEqual([1, 4]);
	});

	test("does not coalesce across a gap of two", () => {
		expect(
			mergeIntervals([1, 2, 4, 5], compareNaturalAscending, nextInteger),
		).toStrictEqual([1, 2, 4, 5]);
	});

	test("chains adjacency through a run of single points", () => {
		expect(
			mergeIntervals(
				[3, 3, 1, 1, 5, 5, 2, 2, 4, 4],
				compareNaturalAscending,
				nextInteger,
			),
		).toStrictEqual([1, 5]);
	});

	test("drops an interval whose start follows its end", () => {
		expect(
			mergeIntervals([5, 1, 10, 12], compareNaturalAscending),
		).toStrictEqual([10, 12]);
	});

	test("keeps a single-point interval", () => {
		expect(mergeIntervals([7, 7], compareNaturalAscending)).toStrictEqual([
			7, 7,
		]);
	});

	test("does not mutate its input", () => {
		const input = [10, 12, 1, 3];

		mergeIntervals(input, compareNaturalAscending);

		expect(input).toStrictEqual([10, 12, 1, 3]);
	});

	test("works over bigint bounds", () => {
		expect(
			mergeIntervals(
				[0n, 10n, 11n, 20n],
				compareNaturalAscending<bigint>,
				(end, next) => next === end + 1n,
			),
		).toStrictEqual([0n, 20n]);
	});

	test("works over string bounds with no adjacency", () => {
		expect(
			mergeIntervals(["a", "m", "k", "z"], compareNaturalAscending<string>),
		).toStrictEqual(["a", "z"]);
	});

	test("agrees with brute-force marking over random inputs", () => {
		const universe = 40;

		for (let seed = 0; seed < 200; seed++) {
			const intervals: number[] = [];
			// A deterministic spread of starts and widths, so a failure reproduces.
			for (let index = 0; index < 8; index++) {
				const start = (seed * 7 + index * 13) % universe;
				const width = (seed + index * 3) % 6;
				intervals.push(start, Math.min(start + width, universe - 1));
			}

			expect(
				mergeIntervals(intervals, compareNaturalAscending, nextInteger),
			).toStrictEqual(coverByMarking(intervals, universe));
		}
	});

	test("produces input isInSortedIntervals can query", () => {
		const merged = mergeIntervals(
			[20, 25, 1, 5, 4, 9],
			compareNaturalAscending,
			nextInteger,
		);

		expect(merged).toStrictEqual([1, 9, 20, 25]);
		expect(isInSortedIntervals(merged, 9, compareNaturalAscending)).toBe(true);
		expect(isInSortedIntervals(merged, 10, compareNaturalAscending)).toBe(
			false,
		);
		expect(isInSortedIntervals(merged, 22, compareNaturalAscending)).toBe(true);
	});
});
