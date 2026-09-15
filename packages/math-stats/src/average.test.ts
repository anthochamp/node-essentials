import { expect, suite, test } from "vitest";

import {
	geometricMean,
	harmonicMean,
	mean,
	median,
	midrange,
	mode,
	rootMeanSquare,
} from "./average.js";

suite("average", () => {
	suite("mean", () => {
		test("calculates the arithmetic mean of the given values", () => {
			expect(mean(1, 2, 3, 4, 5)).toBe(3);
			expect(mean(-1, -2, -3, -4, -5)).toBe(-3);
			expect(mean(1.5, 2.5, 3.5)).toBe(2.5);
			expect(mean()).toBeNaN();
		});
	});

	suite("geometricMean", () => {
		test("calculates the geometric mean of the given values", () => {
			expect(geometricMean(1, 2, 3, 4, 5)).toBeCloseTo(2.605171084697352);
			expect(geometricMean(1.5, 2.5, 3.5)).toBeCloseTo(2.35884699);
			expect(geometricMean()).toBeNaN();
		});

		test("returns zero when any value is zero", () => {
			expect(geometricMean(1, 2, 0, 4)).toBe(0);
		});

		test("survives thousands of values below one", () => {
			// A running product reaches zero after a few hundred factors under one.
			const values = Array.from({ length: 10_000 }, () => 0.5);

			expect(geometricMean(values)).toBeCloseTo(0.5, 10);
		});

		test("survives thousands of values above one", () => {
			const values = Array.from({ length: 10_000 }, () => 2);

			expect(geometricMean(values)).toBeCloseTo(2, 10);
		});
	});

	suite("harmonicMean", () => {
		test("calculates the harmonic mean of the given values", () => {
			expect(harmonicMean(1, 2, 3, 4, 5)).toBeCloseTo(2.18978102189781);
			expect(harmonicMean(1.5, 2.5, 3.5)).toBeCloseTo(2.218309859);
			expect(harmonicMean(1, 2, 0, 4, 5)).toBe(0);
			expect(harmonicMean()).toBeNaN();
		});
	});

	suite("rootMeanSquare", () => {
		test("calculates the root mean square of the given values", () => {
			expect(rootMeanSquare(1, 2, 3, 4, 5)).toBeCloseTo(3.3166247903554);
			expect(rootMeanSquare(-1, -2, -3, -4, -5)).toBeCloseTo(3.3166247903554);
			expect(rootMeanSquare(1.5, 2.5, 3.5)).toBeCloseTo(2.62995564);
			expect(rootMeanSquare()).toBeNaN();
		});
	});

	suite("median", () => {
		test("calculates the median of the given values", () => {
			expect(median(3, 1, 2)).toBe(2);
			expect(median(4, 1, 3, 2)).toBe(2.5);
			expect(median(5)).toBe(5);
			expect(median(-1, -5, -3)).toBe(-3);
			expect(median()).toBeNaN();
		});

		test("agrees with a full sort on a large unordered input", () => {
			const values = Array.from(
				{ length: 1001 },
				(_, index) => (index * 7919) % 1001,
			);
			const sorted = values.toSorted((a, b) => a - b);

			expect(median(values)).toBe(sorted[500]);
		});

		test("does not modify the input array", () => {
			const values = [5, 3, 1, 4, 2];

			median(values);

			expect(values).toEqual([5, 3, 1, 4, 2]);
		});
	});

	suite("mode", () => {
		test("calculates the mode of the given values", () => {
			expect(mode(1, 2, 2, 3, 4, 4, 4, 5)).toEqual([4]);
			expect(mode(-1, -2, -2, -3, -4, -4, -4, -5)).toEqual([-4]);
			expect(mode(1.5, 2.5, 2.5, 3.5)).toEqual([2.5]);
			expect(mode(1, 2, 3, 4, 5)).toEqual([1, 2, 3, 4, 5]);
			expect(mode()).toEqual([]);
		});
	});

	suite("midrange", () => {
		test("calculates the midrange of the given values", () => {
			expect(midrange(1, 2, 4, 5)).toBe(3);
			expect(midrange(-1, -2, -4, -5)).toBe(-3);
			expect(midrange(1.5, 3.5)).toBe(2.5);
			expect(midrange()).toBeNaN();
		});
	});

	suite("array argument", () => {
		test("accepts a single array in place of separate arguments", () => {
			expect(mean([1, 2, 3, 4, 5])).toBe(3);
			expect(geometricMean([1, 2, 3, 4, 5])).toBeCloseTo(2.605171084697352);
			expect(harmonicMean([1, 2, 3, 4, 5])).toBeCloseTo(2.18978102189781);
			expect(rootMeanSquare([1, 2, 3, 4, 5])).toBeCloseTo(3.3166247903554);
			expect(median([3, 1, 2])).toBe(2);
			expect(mode([1, 2, 2, 3])).toEqual([2]);
			expect(midrange([1, 2, 4, 5])).toBe(3);
		});

		test("treats a lone number as a value, not as a list", () => {
			expect(mean(4)).toBe(4);
			expect(median(4)).toBe(4);
			expect(mode(4)).toEqual([4]);
		});

		test("handles an empty array like no arguments", () => {
			expect(mean([])).toBeNaN();
			expect(median([])).toBeNaN();
			expect(midrange([])).toBeNaN();
			expect(mode([])).toEqual([]);
		});
	});
});
