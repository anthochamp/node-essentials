import { describe, expect, it } from "vitest";

import { normalQuantile } from "./normal-quantile.js";
import { poolRandomEffects } from "./random-effects.js";

/** The z-value the interval uses; this file tests the pooling, not the quantile. */
const Z95_ = normalQuantile(0.975);

describe("poolRandomEffects", () => {
	/**
	 * Worked by hand from the DerSimonian–Laird definitions: weights `1/v` are
	 * `[1, 1]`, the fixed-effect average is `15`, Cochran's `Q = 1·25 + 1·25 =
	 * 50` against `df = 1`, the scale is `Σw − Σw²/Σw = 2 − 1 = 1`, so `τ² = 49`
	 * and each random-effects weight is `1/50`. The pooled variance is `1/0.04 =
	 * 25`, giving a standard error of 5.
	 */
	it("estimates the between-group variance from the spread of the groups", () => {
		const pooled = poolRandomEffects([
			{ estimate: 10, variance: 1 },
			{ estimate: 20, variance: 1 },
		]);

		expect(pooled.estimate).toBeCloseTo(15, 10);
		expect(pooled.betweenVariance).toBeCloseTo(49, 10);
		expect(pooled.heterogeneity).toBeCloseTo(0.98, 10);
		expect(pooled.interval.halfWidth).toBeCloseTo(Z95_ * 5, 4);
		expect(pooled.groups).toBe(2);
	});

	/**
	 * Same estimates, but each group is uncertain enough on its own to explain
	 * the gap: `Q = 0.5` falls below `df = 1`, so `τ²` truncates to zero and the
	 * pooled variance is the fixed-effect `1/0.02 = 50`.
	 */
	it("reduces to inverse-variance weighting when the groups agree", () => {
		const pooled = poolRandomEffects([
			{ estimate: 10, variance: 100 },
			{ estimate: 20, variance: 100 },
		]);

		expect(pooled.betweenVariance).toBe(0);
		expect(pooled.heterogeneity).toBe(0);
		expect(pooled.estimate).toBeCloseTo(15, 10);
		expect(pooled.interval.halfWidth).toBeCloseTo(Z95_ * Math.sqrt(50), 4);
	});

	/**
	 * Unequal precision: weights `[1, 0.25]`, fixed-effect average `12`, `Q = 4 +
	 * 16 = 20`, scale `1.25 − 1.0625/1.25 = 0.4`, so `τ² = 47.5`. The
	 * random-effects weights `1/48.5` and `1/51.5` are nearly equal, which is the
	 * point: a large `τ²` washes out the difference in within-group precision,
	 * pulling the estimate from `12` to `1485/100`. The pooled variance is
	 * `2497.75/100`.
	 */
	it("lets a large between-group variance flatten unequal weights", () => {
		const pooled = poolRandomEffects([
			{ estimate: 10, variance: 1 },
			{ estimate: 20, variance: 4 },
		]);

		expect(pooled.betweenVariance).toBeCloseTo(47.5, 10);
		expect(pooled.estimate).toBeCloseTo(14.85, 10);
		expect(pooled.interval.halfWidth).toBeCloseTo(Z95_ * Math.sqrt(24.9775), 8);
	});

	it("returns a single group's own estimate and interval", () => {
		const pooled = poolRandomEffects([{ estimate: 7, variance: 4 }]);

		expect(pooled.estimate).toBe(7);
		expect(pooled.betweenVariance).toBe(0);
		expect(pooled.heterogeneity).toBe(0);
		expect(pooled.interval.halfWidth).toBeCloseTo(Z95_ * 2, 5);
		expect(pooled.groups).toBe(1);
	});

	it("widens the interval as the groups disagree more", () => {
		const agreeing = poolRandomEffects([
			{ estimate: 10, variance: 1 },
			{ estimate: 10.1, variance: 1 },
		]);
		const disagreeing = poolRandomEffects([
			{ estimate: 10, variance: 1 },
			{ estimate: 40, variance: 1 },
		]);

		expect(disagreeing.interval.halfWidth).toBeGreaterThan(
			agreeing.interval.halfWidth,
		);
	});

	it("honours the confidence level", () => {
		const groups = [
			{ estimate: 10, variance: 1 },
			{ estimate: 20, variance: 1 },
		];

		expect(poolRandomEffects(groups, 0.99).interval.halfWidth).toBeGreaterThan(
			poolRandomEffects(groups, 0.95).interval.halfWidth,
		);
		expect(poolRandomEffects(groups, 0.99).interval.level).toBe(0.99);
	});

	it("rejects input it cannot pool", () => {
		expect(() => poolRandomEffects([])).toThrow(RangeError);
		expect(() => poolRandomEffects([{ estimate: 1, variance: 0 }])).toThrow(
			RangeError,
		);
		expect(() => poolRandomEffects([{ estimate: 1, variance: -1 }])).toThrow(
			RangeError,
		);
		expect(() =>
			poolRandomEffects([{ estimate: 1, variance: Number.POSITIVE_INFINITY }]),
		).toThrow(RangeError);
		expect(() => poolRandomEffects([{ estimate: 1, variance: 1 }], 1)).toThrow(
			RangeError,
		);
	});
});
