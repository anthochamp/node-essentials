import { describe, expect, it } from "vitest";

import { mannKendallTrend, reversalRate } from "./trend.js";

describe("mannKendallTrend", () => {
	// `statistic` and `normalised` cross-checked against SciPy's `kendalltau`
	// (asymptotic method), which derives the pairwise statistic and the
	// tie-corrected variance by its own route.
	it.each([
		["a steady ramp", [1, 2, 3, 4, 5, 6, 7, 8], 28, 3.340383700311406],
		["a steady decline", [8, 7, 6, 5, 4, 3, 2, 1], -28, -3.340383700311406],
		["a rising zigzag", [1, 5, 2, 6, 3, 7, 4, 8], 16, 1.8557687223952255],
		["a tied ramp", [1, 1, 2, 2, 3, 3, 4, 4], 24, 2.9368350311176825],
		[
			"a noisy series",
			[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5],
			16,
			1.188332399294654,
		],
	] as const)(
		"matches SciPy for %s",
		(_name, values, statistic, normalised) => {
			const trend = mannKendallTrend([...values]);

			expect(trend.statistic).toBe(statistic);
			expect(trend.normalised).toBeCloseTo(normalised, 10);
		},
	);

	it("negates when the series is reversed", () => {
		const values = [3, 1, 4, 1, 5, 9, 2, 6];

		const forward = mannKendallTrend(values);
		const backward = mannKendallTrend([...values].reverse());

		expect(backward.statistic).toBe(-forward.statistic);
		expect(backward.normalised).toBeCloseTo(-forward.normalised, 12);
	});

	it("is zero for a flat series", () => {
		const trend = mannKendallTrend([2, 2, 2, 2, 2]);

		expect(trend.statistic).toBe(0);
		expect(trend.normalised).toBe(0);
	});

	it("is zero for a series too short to have a pair", () => {
		expect(mannKendallTrend([])).toEqual({ statistic: 0, normalised: 0 });
		expect(mannKendallTrend([7])).toEqual({ statistic: 0, normalised: 0 });
	});

	it("ranks a drifting series above an oscillating one of equal amplitude", () => {
		const drift = [1, 2, 3, 4, 5, 6, 7, 8];
		const oscillation = [1, 8, 1, 8, 1, 8, 1, 8];

		expect(Math.abs(mannKendallTrend(drift).normalised)).toBeGreaterThan(
			Math.abs(mannKendallTrend(oscillation).normalised),
		);
	});

	it("ignores the size of each step, only its sign", () => {
		const gentle = [1, 2, 3, 4, 5];
		const spiked = [1, 2, 3, 4, 1000];

		expect(mannKendallTrend(spiked).statistic).toBe(
			mannKendallTrend(gentle).statistic,
		);
	});
});

describe("reversalRate", () => {
	it("is zero for a monotone series", () => {
		expect(reversalRate([1, 2, 3, 4, 5])).toBe(0);
		expect(reversalRate([5, 4, 3, 2, 1])).toBe(0);
	});

	it("is one for a perfectly alternating series", () => {
		expect(reversalRate([1, 5, 2, 6, 3, 7, 4, 8])).toBe(1);
	});

	it("counts each interior direction change once", () => {
		// Signs of the nine steps: - + - + + - + - - +, changing seven times.
		expect(reversalRate([3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5])).toBeCloseTo(
			7 / 9,
			12,
		);
	});

	it("treats a flat step as continuing the current direction", () => {
		expect(reversalRate([1, 1, 2, 2, 3, 3, 4, 4])).toBe(0);
		expect(reversalRate([2, 2, 2, 2, 2])).toBe(0);
	});

	it("is zero for a series with no interior point", () => {
		expect(reversalRate([])).toBe(0);
		expect(reversalRate([1])).toBe(0);
		expect(reversalRate([1, 2])).toBe(0);
	});

	it("separates oscillation from drift, where the trend statistic does not", () => {
		const drift = [1, 2, 3, 4, 5, 6, 7, 8];
		const oscillation = [1, 8, 1, 8, 1, 8, 1, 8];

		expect(reversalRate(oscillation)).toBeGreaterThan(reversalRate(drift));
	});
});
