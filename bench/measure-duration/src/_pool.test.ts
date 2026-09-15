import { MeasureExecution } from "@ac-bench/core/plugin";
import { describe, expect, it } from "vitest";

import { poolDurationExecutions } from "./_pool.js";
import { summarise } from "./_statistics.js";
import { DurationBenchRunCaseResult } from "./_types.js";

function execution_(
	timings: readonly number[],
	arm: "shared" | "isolated" = "shared",
	replicate = 0,
): MeasureExecution<DurationBenchRunCaseResult> {
	return {
		arm,
		replicate,
		result: {
			name: "case",
			tags: {},
			statistics: summarise(timings),
			adjusted: null,
			overheadMs: 0,
			timings: [...timings],
			sampling: null,
			harnessOverhead: null,
			execution: "in-process",
			spawnBaseline: null,
			coldStart: null,
			estimate: null,
			contamination: null,
			warnings: [],
		},
	};
}

/**
 * Ten samples jittered around `centre`, so the interval is neither zero nor
 * huge.
 */
function around_(centre: number): number[] {
	return [-4, -3, -2, -1, 0, 0, 1, 2, 3, 4].map(
		(offset) => centre + offset * 0.01,
	);
}

describe("poolDurationExecutions", () => {
	it("returns the sole execution's result untouched", () => {
		const only = execution_(around_(1));

		expect(poolDurationExecutions([only])).toBe(only.result);
	});

	it("reports an estimate between the executions it combined", () => {
		const pooled = poolDurationExecutions([
			execution_(around_(1)),
			execution_(around_(2), "shared", 1),
			execution_(around_(3), "shared", 2),
		]);

		expect(pooled.estimate).not.toBeNull();
		expect(pooled.estimate!.estimateMs).toBeGreaterThan(1);
		expect(pooled.estimate!.estimateMs).toBeLessThan(3);
		expect(pooled.estimate!.executions).toBe(3);
	});

	// Processes that disagree far beyond their own uncertainty are the process
	// lottery; that is what the between-process variance exists to report.
	it("finds between-process variance when the executions disagree", () => {
		const agreeing = poolDurationExecutions([
			execution_(around_(1)),
			execution_(around_(1.001), "shared", 1),
		]);
		const disagreeing = poolDurationExecutions([
			execution_(around_(1)),
			execution_(around_(9), "shared", 1),
		]);

		expect(agreeing.estimate!.betweenVarianceMs2).toBeLessThan(
			disagreeing.estimate!.betweenVarianceMs2,
		);
		expect(disagreeing.estimate!.heterogeneity).toBeGreaterThan(0.9);
	});

	it("keeps every sample behind the pooled statistics", () => {
		const pooled = poolDurationExecutions([
			execution_(around_(1)),
			execution_(around_(2), "shared", 1),
		]);

		expect(pooled.timings).toHaveLength(20);
		expect(pooled.statistics!.samples).toBe(20);
	});

	it("measures contamination when both arms ran", () => {
		const pooled = poolDurationExecutions([
			execution_(around_(3)),
			execution_(around_(3), "shared", 1),
			execution_(around_(2), "isolated"),
		]);

		expect(pooled.contamination?.differenceMs).toBeCloseTo(1, 6);
		expect(pooled.contamination?.share).toBeCloseTo(0.5, 6);
		expect(pooled.contamination?.sharedExecutions).toBe(2);
		expect(pooled.contamination?.isolatedExecutions).toBe(1);
	});

	// One arm gives nothing to compare against, and a difference of an estimate
	// with itself is zero by construction rather than by measurement.
	it("reports no contamination when only one arm ran", () => {
		const pooled = poolDurationExecutions([
			execution_(around_(1)),
			execution_(around_(2), "shared", 1),
		]);

		expect(pooled.contamination).toBeNull();
	});

	it("reports each warning kind once, with how many executions raised it", () => {
		const noisy = execution_(around_(1));
		const warning = {
			kind: "high-variance" as const,
			message: "the machine was busy",
		};

		const pooled = poolDurationExecutions([
			{ ...noisy, result: { ...noisy.result, warnings: [warning] } },
			{
				...noisy,
				replicate: 1,
				result: {
					...noisy.result,
					warnings: [{ ...warning, message: "the machine was busier" }],
				},
			},
		]);

		expect(pooled.warnings).toHaveLength(1);
		expect(pooled.warnings[0]?.message).toBe(
			"the machine was busy (in 2 of 2 executions)",
		);
	});

	it("ignores executions that never produced statistics", () => {
		const failed: MeasureExecution<DurationBenchRunCaseResult> = {
			arm: "shared",
			replicate: 1,
			result: { ...execution_([1]).result, statistics: null, failure: "boom" },
		};
		const measured = execution_(around_(1));

		expect(poolDurationExecutions([measured, failed])).toBe(measured.result);
	});

	it("reports the failure when every execution failed", () => {
		const failed: MeasureExecution<DurationBenchRunCaseResult> = {
			arm: "shared",
			replicate: 0,
			result: { ...execution_([1]).result, statistics: null, failure: "boom" },
		};

		expect(poolDurationExecutions([failed]).failure).toBe("boom");
	});

	// Identical samples give a zero-width interval, so there is no precision to
	// weight by; the samples are still merged rather than the case being lost.
	it("merges without an estimate when an execution has no spread", () => {
		const pooled = poolDurationExecutions([
			execution_([1, 1, 1, 1]),
			execution_([2, 2, 2, 2], "shared", 1),
		]);

		expect(pooled.estimate).toBeNull();
		expect(pooled.timings).toHaveLength(8);
	});

	it("pools the mean when asked for the mean", () => {
		const executions = [
			execution_(around_(1)),
			execution_(around_(2), "shared", 1),
		];

		expect(poolDurationExecutions(executions, "mean").estimate!.estimator).toBe(
			"mean",
		);
	});
});
