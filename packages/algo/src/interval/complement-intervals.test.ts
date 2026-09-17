import { compareNaturalAscending } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { complementIntervals } from "./complement-intervals.js";
import { INTEGER_INTERVAL_STEP } from "./interval-step.js";
import { mergeIntervals } from "./merge-intervals.js";

const complement = (
	intervals: readonly number[],
	bounds: readonly [number, number],
): number[] =>
	complementIntervals(
		intervals,
		bounds,
		compareNaturalAscending,
		INTEGER_INTERVAL_STEP,
	);

/** Every integer a flat interval list covers, as a set. */
function pointsOf(intervals: readonly number[]): Set<number> {
	const points = new Set<number>();

	for (let pair = 0; pair * 2 < intervals.length; pair++) {
		for (
			let value = intervals[pair * 2]!;
			value <= intervals[pair * 2 + 1]!;
			value++
		) {
			points.add(value);
		}
	}

	return points;
}

suite("complementIntervals", () => {
	test("returns the whole window when nothing is covered", () => {
		expect(complement([], [0, 9])).toStrictEqual([0, 9]);
	});

	test("returns nothing when the window is fully covered", () => {
		expect(complement([0, 9], [0, 9])).toStrictEqual([]);
	});

	test("reports the gap between two intervals", () => {
		expect(complement([0, 2, 7, 9], [0, 9])).toStrictEqual([3, 6]);
	});

	test("reports a leading and a trailing gap", () => {
		expect(complement([3, 5], [0, 9])).toStrictEqual([0, 2, 6, 9]);
	});

	test("clips intervals reaching past the window", () => {
		expect(complement([-10, 2, 7, 100], [0, 9])).toStrictEqual([3, 6]);
	});

	test("ignores intervals entirely outside the window", () => {
		expect(complement([-10, -5, 50, 60], [0, 9])).toStrictEqual([0, 9]);
	});

	test("returns nothing for an empty window", () => {
		expect(complement([], [9, 0])).toStrictEqual([]);
	});

	test("treats a single-point window as any other", () => {
		expect(complement([], [4, 4])).toStrictEqual([4, 4]);
		expect(complement([4, 4], [4, 4])).toStrictEqual([]);
	});

	test("rejects an odd number of bounds", () => {
		expect(() => complement([1, 2, 3], [0, 9])).toThrow(RangeError);
	});

	test("is the set complement, checked point by point", () => {
		const universe = 40;

		for (let seed = 0; seed < 200; seed++) {
			const raw: number[] = [];

			for (let count = 0; count < 5; count++) {
				const start = (seed * (count + 7)) % universe;
				raw.push(start, start + ((seed + count) % 6));
			}

			const merged = mergeIntervals(
				raw,
				compareNaturalAscending<number>,
				(end, next) => next === end + 1,
			);
			const gaps = pointsOf(complement(merged, [0, universe - 1]));
			const covered = pointsOf(merged);

			for (let value = 0; value < universe; value++) {
				expect(gaps.has(value)).toBe(!covered.has(value));
			}
		}
	});

	test("returns intervals a merge would leave untouched", () => {
		const gaps = complement([2, 3, 6, 7], [0, 9]);

		expect(
			mergeIntervals(
				gaps,
				compareNaturalAscending<number>,
				(end, next) => next === end + 1,
			),
		).toStrictEqual(gaps);
	});
});
