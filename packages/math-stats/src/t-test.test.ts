import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { tTest } from "./t-test.js";

const A = [5.1, 4.9, 5.3, 5.0, 5.2, 4.8] as const;
const B = [5.9, 6.1, 5.8, 6.0, 6.2, 5.7] as const;

// From SciPy's `stats.ttest_ind`, `ttest_1samp` and `ttest_rel` on the same two
// samples.
const TOLERANCE = 1e-12;

suite("tTest", () => {
	test("matches Welch's two-sample test", () => {
		const result = tTest(A, B);

		expectCloseRelative(result.statistic, -8.332380897952968, TOLERANCE);
		expectCloseRelative(result.pValue, 8.229011996181941e-6, TOLERANCE);
		expectCloseRelative(result.degreesOfFreedom, 10, TOLERANCE);
	});

	test("matches the pooled two-sample test", () => {
		const result = tTest(A, B, { pooled: true });

		expectCloseRelative(result.statistic, -8.33238089795297, TOLERANCE);
		expectCloseRelative(result.pValue, 8.22901199618193e-6, TOLERANCE);
		expect(result.degreesOfFreedom).toBe(10);
	});

	test("runs the one-sample test against a hypothesised mean", () => {
		const result = tTest(A, 5);

		expectCloseRelative(result.statistic, 0.654653670707975, TOLERANCE);
		expectCloseRelative(result.pValue, 0.5416045607931215, TOLERANCE);
		expect(result.degreesOfFreedom).toBe(5);
	});

	test("runs the paired test on the differences", () => {
		const result = tTest(A, B, { paired: true });

		expectCloseRelative(result.statistic, -9.315885051121791, TOLERANCE);
		expectCloseRelative(result.pValue, 0.00023988758745002034, TOLERANCE);
		expect(result.degreesOfFreedom).toBe(5);
	});

	test("splits the two-sided p-value between the one-sided ones", () => {
		const less = tTest(A, B, { alternative: "less" });
		const greater = tTest(A, B, { alternative: "greater" });

		expectCloseRelative(less.pValue, 4.114505998090971e-6, TOLERANCE);
		expectCloseRelative(greater.pValue, 0.9999958854940019, TOLERANCE);
		expectCloseRelative(less.pValue + greater.pValue, 1, TOLERANCE);
	});

	test("reports a tail no subtraction from one could reach", () => {
		// Separation this wide puts the p-value far below where `1 - cdf` has any
		// significant digits left; the direct tail still resolves it.
		const far = tTest([0, 0.001, -0.001, 0.0005], [100, 100.001, 99.999, 100]);

		expect(far.pValue).toBeGreaterThan(0);
		expect(far.pValue).toBeLessThan(1e-15);
	});

	test("is antisymmetric in the order of its samples", () => {
		const forward = tTest(A, B);
		const reversed = tTest(B, A);

		expectCloseRelative(forward.statistic, -reversed.statistic, TOLERANCE);
		expectCloseRelative(forward.pValue, reversed.pValue, TOLERANCE);
	});

	test("rejects samples it cannot test", () => {
		expect(() => tTest([1], [1, 2])).toThrow(RangeError);
		expect(() => tTest([1], 0)).toThrow(RangeError);
		expect(() => tTest([1, 2], [1], { pooled: true })).toThrow(RangeError);
		expect(() => tTest([1, 2, 3], [1, 2], { paired: true })).toThrow(
			RangeError,
		);
	});
});
