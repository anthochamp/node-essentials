import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { oneWayAnova } from "./one-way-anova.js";

suite("oneWayAnova", () => {
	test("matches SciPy on clearly separated groups", () => {
		const result = oneWayAnova([
			[1, 2, 3, 4],
			[2, 3, 4, 5],
			[10, 11, 12, 13],
		]);

		expectCloseRelative(result.statistic, 58.39999999999999, 1e-13);
		expect(result.numeratorDegreesOfFreedom).toBe(2);
		expect(result.denominatorDegreesOfFreedom).toBe(9);
		expectCloseRelative(result.pValue, 7.0069401421897455e-6, 1e-11);
	});

	test("finds nothing between groups drawn the same way", () => {
		const result = oneWayAnova([
			[1, 2, 3, 4],
			[1, 2, 3, 4],
			[1, 2, 3, 4],
		]);

		expect(result.statistic).toBe(0);
		expect(result.pValue).toBe(1);
	});

	test("agrees with the pooled two-sample t-test on two groups", () => {
		// F on (1, n − 2) degrees of freedom is the square of that t-statistic, so
		// the two tests must return the same p-value.
		const a = [5.1, 4.9, 5.3, 5.0, 5.2, 4.8];
		const b = [5.9, 6.1, 5.8, 6.0, 6.2, 5.7];
		const result = oneWayAnova([a, b]);

		expect(result.numeratorDegreesOfFreedom).toBe(1);
		expectCloseRelative(result.statistic, 8.33238089795297 ** 2, 1e-11);
		expectCloseRelative(result.pValue, 8.22901199618193e-6, 1e-10);
	});

	test("handles groups of different sizes", () => {
		const result = oneWayAnova([
			[1, 2, 3],
			[4, 5, 6, 7, 8],
			[9, 10],
		]);

		expect(result.denominatorDegreesOfFreedom).toBe(7);
		expect(result.pValue).toBeGreaterThan(0);
		expect(result.pValue).toBeLessThan(1);
	});

	test("reports no ratio when no group varies within itself", () => {
		const result = oneWayAnova([
			[1, 1, 1],
			[2, 2, 2],
		]);

		expect(result.statistic).toBeNaN();
		expect(result.pValue).toBeNaN();
	});

	test("rejects inputs the analysis is undefined for", () => {
		expect(() => oneWayAnova([[1, 2, 3]])).toThrow(RangeError);
		expect(() => oneWayAnova([[1, 2], []])).toThrow(RangeError);
		expect(() => oneWayAnova([[1], [2]])).toThrow(RangeError);
	});
});
