import { describe, expect, it } from "vitest";

import {
	meanConfidenceInterval,
	medianConfidenceInterval,
} from "./confidence-interval.js";

// A sample whose mean (5) and sample standard deviation (√(32/7)) are exact
// textbook values, so the expected half-widths below are `z · s / √n` worked
// out by hand rather than read off the implementation. They are asserted to
// 7 digits: `z` comes from an approximation bounded at 1.15e-9 *relative*
// error, so a tighter tolerance would assert precision the input lacks.
const SAMPLE = [2, 4, 4, 4, 5, 5, 7, 9] as const;

describe("meanConfidenceInterval", () => {
	it("matches the hand-computed 95% interval", () => {
		const interval = meanConfidenceInterval([...SAMPLE]);

		expect(interval.estimate).toBe(5);
		expect(interval.halfWidth).toBeCloseTo(1.481593509067493, 7);
		expect(interval.lower).toBeCloseTo(3.518406490932507, 7);
		expect(interval.upper).toBeCloseTo(6.481593509067493, 7);
		expect(interval.level).toBe(0.95);
	});

	it("widens at a higher confidence level", () => {
		const interval = meanConfidenceInterval([...SAMPLE], 0.99);

		expect(interval.halfWidth).toBeCloseTo(1.9471439305551694, 7);
		expect(interval.lower).toBeCloseTo(3.0528560694448306, 7);
		expect(interval.upper).toBeCloseTo(6.947143930555169, 7);
		expect(interval.level).toBe(0.99);
	});

	it("is symmetric about the estimate", () => {
		const { estimate, lower, upper, halfWidth } = meanConfidenceInterval([
			...SAMPLE,
		]);

		expect(estimate - lower).toBeCloseTo(halfWidth, 12);
		expect(upper - estimate).toBeCloseTo(halfWidth, 12);
	});

	it("collapses to a point for a sample with no spread", () => {
		const interval = meanConfidenceInterval([3, 3, 3, 3]);

		expect(interval.estimate).toBe(3);
		expect(interval.halfWidth).toBe(0);
	});

	it("rejects a sample with fewer than two values", () => {
		expect(() => meanConfidenceInterval([1])).toThrow(RangeError);
	});

	it("rejects a confidence level outside (0, 1)", () => {
		expect(() => meanConfidenceInterval([...SAMPLE], 0)).toThrow(RangeError);
		expect(() => meanConfidenceInterval([...SAMPLE], 1)).toThrow(RangeError);
	});
});

describe("medianConfidenceInterval", () => {
	// 1-based order-statistic ranks, computed independently from the binomial
	// rank bounds: lower = floor(n/2 - z√n/2), upper = its mirror n + 1 - lower.
	it.each([
		[20, 0.95, 5, 16],
		[21, 0.95, 6, 16],
		[100, 0.95, 40, 61],
		[20, 0.99, 4, 17],
	])(
		"brackets the median with ranks %s/%s → (%s, %s)",
		(count, level, lowerRank, upperRank) => {
			// Values equal their own 1-based rank, so a bound reveals its rank.
			const sorted = Array.from({ length: count }, (_, index) => index + 1);

			const interval = medianConfidenceInterval(sorted, level);

			expect(interval.lower).toBe(lowerRank);
			expect(interval.upper).toBe(upperRank);
		},
	);

	it("uses ranks symmetric about the middle of the sample", () => {
		const count = 63;
		const sorted = Array.from({ length: count }, (_, index) => index + 1);

		const { lower, upper } = medianConfidenceInterval(sorted);

		expect(lower + upper).toBe(count + 1);
	});

	it("estimates the sample median and brackets it", () => {
		const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

		const interval = medianConfidenceInterval(sorted);

		expect(interval.estimate).toBe(5.5);
		expect(interval.lower).toBeLessThanOrEqual(interval.estimate);
		expect(interval.upper).toBeGreaterThanOrEqual(interval.estimate);
		expect(interval.halfWidth).toBe((interval.upper - interval.lower) / 2);
	});

	it("returns bounds that are actual sample values", () => {
		const sorted = [0.1, 0.4, 0.4, 0.9, 1.5, 2.2, 90];

		const { lower, upper } = medianConfidenceInterval(sorted);

		expect(sorted).toContain(lower);
		expect(sorted).toContain(upper);
	});

	it("is unmoved by an extreme outlier, unlike the mean interval", () => {
		const base = Array.from({ length: 40 }, (_, index) => index + 1);
		const contaminated = [...base.slice(0, 39), 10_000];

		const clean = medianConfidenceInterval(base);
		const dirty = medianConfidenceInterval(contaminated);

		expect(dirty.lower).toBe(clean.lower);
		expect(dirty.upper).toBe(clean.upper);
		expect(meanConfidenceInterval(contaminated).halfWidth).toBeGreaterThan(
			meanConfidenceInterval(base).halfWidth,
		);
	});

	it("widens at a higher confidence level", () => {
		const sorted = Array.from({ length: 50 }, (_, index) => index + 1);

		const wide = medianConfidenceInterval(sorted, 0.99);
		const narrow = medianConfidenceInterval(sorted, 0.95);

		expect(wide.lower).toBeLessThan(narrow.lower);
		expect(wide.upper).toBeGreaterThan(narrow.upper);
	});

	it("spans the whole sample when the level is unreachable", () => {
		const sorted = [1, 2, 3, 4, 5];

		const interval = medianConfidenceInterval(sorted);

		expect(interval.lower).toBe(1);
		expect(interval.upper).toBe(5);
	});

	it("rejects an empty sample", () => {
		expect(() => medianConfidenceInterval([])).toThrow(RangeError);
	});

	it("rejects a confidence level outside (0, 1)", () => {
		expect(() => medianConfidenceInterval([1, 2, 3], 1.5)).toThrow(RangeError);
	});
});
