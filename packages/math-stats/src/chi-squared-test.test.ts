import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { chiSquaredTest } from "./chi-squared-test.js";

const OBSERVED = [16, 18, 16, 14, 12, 12] as const;
/** The uniform expectation, which is what SciPy assumes by default. */
const UNIFORM = OBSERVED.map(
	() => OBSERVED.reduce((total, count) => total + count, 0) / OBSERVED.length,
);

suite("chiSquaredTest", () => {
	test("matches SciPy against a uniform expectation", () => {
		const result = chiSquaredTest(OBSERVED, UNIFORM);

		expectCloseRelative(result.statistic, 2, 1e-13);
		expect(result.degreesOfFreedom).toBe(5);
		expectCloseRelative(result.pValue, 0.8491450360846096, 1e-12);
	});

	test("matches SciPy against an uneven expectation", () => {
		const result = chiSquaredTest(
			[30, 14, 34, 45, 57, 20],
			[20, 20, 30, 40, 60, 30],
		);

		expectCloseRelative(result.statistic, 11.441666666666666, 1e-13);
		expectCloseRelative(result.pValue, 0.04329313031580497, 1e-12);
	});

	test("spends one degree of freedom per fitted parameter", () => {
		const result = chiSquaredTest(OBSERVED, UNIFORM, {
			fittedParameters: 1,
		});

		expect(result.degreesOfFreedom).toBe(4);
		expectCloseRelative(result.pValue, 0.7357588823428847, 1e-12);
	});

	test("is exactly zero when the counts are what was expected", () => {
		const result = chiSquaredTest([10, 20, 30], [10, 20, 30]);

		expect(result.statistic).toBe(0);
		expect(result.pValue).toBe(1);
	});

	test("reports a tail no subtraction from one could reach", () => {
		// `1 - cdf` is exactly 0 from about `1e-17` down; this is 48 orders of
		// magnitude past that and still carries every digit SciPy reports.
		const result = chiSquaredTest([250, 50, 50, 50], [100, 100, 100, 100]);

		expectCloseRelative(result.statistic, 300, 1e-13);
		expectCloseRelative(result.pValue, 9.948758346327588e-65, 1e-11);
	});

	test("rejects inputs the statistic is undefined for", () => {
		expect(() => chiSquaredTest([1, 2], [1, 2, 3])).toThrow(RangeError);
		expect(() => chiSquaredTest([5], [5])).toThrow(RangeError);
		expect(() => chiSquaredTest([1, 2, 3], [0, 3, 3])).toThrow(RangeError);
		expect(() =>
			chiSquaredTest([1, 2, 3], [2, 2, 2], {
				fittedParameters: 2,
			}),
		).toThrow(RangeError);
	});

	test("rejects an expectation over a different total", () => {
		expect(() =>
			chiSquaredTest([16, 18, 16, 14, 12, 12], Array(6).fill(16)),
		).toThrow(RangeError);
	});
});
