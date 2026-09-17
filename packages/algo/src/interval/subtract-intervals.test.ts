import { compareNaturalAscending } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { INTEGER_INTERVAL_STEP } from "./interval-step.js";
import { mergeIntervals } from "./merge-intervals.js";
import { subtractIntervals } from "./subtract-intervals.js";

const subtract = (a: readonly number[], b: readonly number[]): number[] =>
	subtractIntervals(a, b, compareNaturalAscending, INTEGER_INTERVAL_STEP);

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

suite("subtractIntervals", () => {
	test("returns the input when nothing is removed", () => {
		expect(subtract([0, 9], [])).toStrictEqual([0, 9]);
	});

	test("returns nothing when the input is empty", () => {
		expect(subtract([], [0, 9])).toStrictEqual([]);
	});

	test("splits an interval around a hole", () => {
		expect(subtract([0, 10], [3, 5])).toStrictEqual([0, 2, 6, 10]);
	});

	test("removes an interval entirely", () => {
		expect(subtract([3, 5], [0, 10])).toStrictEqual([]);
	});

	test("trims a leading and a trailing overlap", () => {
		expect(subtract([0, 10], [-5, 2])).toStrictEqual([3, 10]);
		expect(subtract([0, 10], [8, 20])).toStrictEqual([0, 7]);
	});

	test("ignores holes that miss the input", () => {
		expect(subtract([5, 10], [0, 2, 20, 30])).toStrictEqual([5, 10]);
	});

	test("carves several holes out of one interval", () => {
		expect(subtract([0, 20], [2, 3, 8, 9, 15, 16])).toStrictEqual([
			0, 1, 4, 7, 10, 14, 17, 20,
		]);
	});

	test("applies one hole spanning several intervals", () => {
		expect(subtract([0, 4, 6, 10, 12, 16], [3, 13])).toStrictEqual([
			0, 2, 14, 16,
		]);
	});

	test("rejects an odd number of bounds", () => {
		expect(() => subtract([1, 2, 3], [0, 9])).toThrow(RangeError);
		expect(() => subtract([0, 9], [1, 2, 3])).toThrow(RangeError);
	});

	test("is the set difference, checked point by point", () => {
		const universe = 40;
		const isAdjacent = (end: number, next: number): boolean => next === end + 1;

		for (let seed = 0; seed < 200; seed++) {
			const rawA: number[] = [];
			const rawB: number[] = [];

			for (let count = 0; count < 4; count++) {
				const startA = (seed * (count + 3)) % universe;
				rawA.push(startA, startA + ((seed + count) % 7));
				const startB = (seed * (count + 5) + 11) % universe;
				rawB.push(startB, startB + ((seed + count) % 5));
			}

			const a = mergeIntervals(
				rawA,
				compareNaturalAscending<number>,
				isAdjacent,
			);
			const b = mergeIntervals(
				rawB,
				compareNaturalAscending<number>,
				isAdjacent,
			);
			const remaining = subtract(a, b);
			const kept = pointsOf(remaining);
			const inA = pointsOf(a);
			const inB = pointsOf(b);

			for (let value = 0; value < universe; value++) {
				expect(kept.has(value)).toBe(inA.has(value) && !inB.has(value));
			}

			// A result that still merges to itself is already minimal, which is what
			// lets callers skip re-normalising.
			expect(
				mergeIntervals(remaining, compareNaturalAscending<number>, isAdjacent),
			).toStrictEqual(remaining);
		}
	});
});
