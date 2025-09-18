import { expect, suite, test } from "vitest";
import {
	geometricMean,
	harmonicMean,
	mean,
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
			expect(mean(1, 2, 3, 4, 5)).toBe(3);
			expect(mean(-1, -2, -3, -4, -5)).toBe(-3);
			expect(mean(1.5, 2.5, 3.5)).toBe(2.5);
			expect(mean()).toBeNaN();
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
});
