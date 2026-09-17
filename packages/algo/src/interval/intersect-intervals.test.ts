import { compareNaturalAscending } from "@ac-kit/core";
import { expect, suite, test } from "vitest";

import { intersectIntervals } from "./intersect-intervals.js";
import { mergeIntervals } from "./merge-intervals.js";

const intersect = (a: readonly number[], b: readonly number[]): number[] =>
	intersectIntervals(a, b, compareNaturalAscending);

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

suite("intersectIntervals", () => {
	test("returns nothing when either side is empty", () => {
		expect(intersect([], [0, 9])).toStrictEqual([]);
		expect(intersect([0, 9], [])).toStrictEqual([]);
	});

	test("returns nothing for disjoint sets", () => {
		expect(intersect([0, 2], [5, 9])).toStrictEqual([]);
	});

	test("narrows to the overlap", () => {
		expect(intersect([0, 5], [3, 9])).toStrictEqual([3, 5]);
	});

	test("keeps the inner interval when one contains the other", () => {
		expect(intersect([0, 9], [3, 5])).toStrictEqual([3, 5]);
	});

	test("meets a single shared point", () => {
		expect(intersect([0, 5], [5, 9])).toStrictEqual([5, 5]);
	});

	test("splits one interval against several", () => {
		expect(intersect([0, 20], [1, 3, 7, 9, 15, 30])).toStrictEqual([
			1, 3, 7, 9, 15, 20,
		]);
	});

	test("walks both sides without losing an interval", () => {
		expect(intersect([0, 4, 10, 14], [2, 12])).toStrictEqual([2, 4, 10, 12]);
	});

	test("rejects an odd number of bounds", () => {
		expect(() => intersect([1, 2, 3], [0, 9])).toThrow(RangeError);
		expect(() => intersect([0, 9], [1, 2, 3])).toThrow(RangeError);
	});

	test("is commutative", () => {
		const left = [0, 4, 10, 14, 20, 24];
		const right = [2, 12, 22, 30];

		expect(intersect(left, right)).toStrictEqual(intersect(right, left));
	});

	test("is the set intersection, checked point by point", () => {
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
			const both = pointsOf(intersect(a, b));
			const inA = pointsOf(a);
			const inB = pointsOf(b);

			for (let value = 0; value < universe; value++) {
				expect(both.has(value)).toBe(inA.has(value) && inB.has(value));
			}
		}
	});
});
