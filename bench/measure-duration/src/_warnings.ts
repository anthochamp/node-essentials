import * as z from "zod/mini";

import {
	HARNESS_OVERHEAD_DOMINATES,
	HarnessOverhead,
} from "./_harness-overhead.js";
import { DurationSamplingReport } from "./_sampling-report.js";
import {
	SPAWN_BASELINE_DOMINATES,
	SpawnBaselineReport,
} from "./_spawn-baseline.js";
import { DurationStatistics } from "./_statistics-schema.js";

/** Robust dispersion above which results are considered unstable. */
const HIGH_VARIANCE = 0.1;

/** Fraction of samples that must be outliers before it is worth reporting. */
const OUTLIER_FRACTION = 0.05;

/** How much slower the first sample must be to suggest missing warmup. */
const FIRST_RUN_SLOW_FACTOR = 1.5;

/** Fraction of runtime above which declared overhead dominates the result. */
const OVERHEAD_DOMINATES = 0.25;

/** Categories of quality problem detected in a result. */
export const durationBenchWarningKindSchema = z.enum([
	"outliers",
	"first-run-slow",
	"high-variance",
	"overhead-dominates",
	"too-few-samples",
	"target-not-reached",
	"harness-overhead-dominates",
	"overhead-subtracted",
	"no-baseline-args",
	"spawn-baseline-dominates",
	"spawn-baseline-subtracted",
]);
export type DurationBenchWarningKind = z.infer<
	typeof durationBenchWarningKindSchema
>;

/** A quality problem that should be shown alongside the numbers. */
export const durationBenchWarningSchema = z.object({
	kind: durationBenchWarningKindSchema,
	message: z.string(),
	/** Defaults to `"warning"`; `"info"` states a fact rather than a problem. */
	severity: z.optional(z.enum(["info", "warning"])),
});
export type DurationBenchWarning = z.infer<typeof durationBenchWarningSchema>;

export type DetectWarningsInput = {
	readonly timings: readonly number[];
	readonly statistics: DurationStatistics;
	readonly overheadMs: number;
	readonly minRuns: number;
	/** Omitted when the case never got as far as sampling. */
	readonly sampling?: DurationSamplingReport | null;
	readonly harnessOverhead?: HarnessOverhead | null;
	readonly spawnBaseline?: SpawnBaselineReport | null;
	/** A process-based case that declared no do-nothing invocation. */
	readonly needsBaselineArgs?: boolean;
};

/**
 * Surfaces conditions that make a number untrustworthy.
 *
 * Reporting a tidy median while the machine was busy is worse than reporting
 * nothing, because it looks authoritative.
 */
export function detectWarnings_(
	input: DetectWarningsInput,
): DurationBenchWarning[] {
	const { timings, statistics, overheadMs, minRuns } = input;
	const warnings: DurationBenchWarning[] = [];

	if (statistics.samples < minRuns) {
		warnings.push({
			kind: "too-few-samples",
			message: `only ${statistics.samples} samples collected; results are indicative at best`,
		});
	}

	// A target the run did not meet is the one thing a tight-looking interval
	// must not be allowed to hide.
	if (
		input.sampling != null &&
		input.sampling.effectiveRelativeErrorTarget !== null &&
		!input.sampling.targetReached
	) {
		const achieved = input.sampling.achievedRelativeError;

		warnings.push({
			kind: "target-not-reached",
			message: `stopped on ${input.sampling.stopReason} at ${
				achieved === null
					? "an unknown relative error"
					: `${(achieved * 100).toFixed(1)}% relative error`
			}, short of the ${(input.sampling.effectiveRelativeErrorTarget * 100).toFixed(1)}% asked for`,
		});
	}

	const harness = input.harnessOverhead;

	if (harness != null && harness.share > HARNESS_OVERHEAD_DOMINATES) {
		warnings.push({
			kind: "harness-overhead-dominates",
			message: `${(harness.share * 100).toFixed(0)}% of each ${harness.shape} sample is the harness itself (${harness.medianMs.toFixed(6)}ms); the workload is too small to time this way`,
		});
	}

	// States a fact rather than a problem, so that nobody compares a corrected
	// number against an uncorrected one by accident.
	if (harness?.subtracted === true) {
		warnings.push({
			kind: "overhead-subtracted",
			severity: "info",
			message: `${harness.medianMs.toFixed(6)}ms of ${harness.shape} harness overhead was removed from every sample`,
		});
	}

	if (input.needsBaselineArgs === true) {
		warnings.push({
			kind: "no-baseline-args",
			message:
				"no baselineArgs given, so the program's own start-up time is reported as work; pass the arguments that make it do nothing",
		});
	}

	const baseline = input.spawnBaseline;

	if (baseline != null && baseline.share > SPAWN_BASELINE_DOMINATES) {
		warnings.push({
			kind: "spawn-baseline-dominates",
			message: `${(baseline.share * 100).toFixed(0)}% of each sample is starting the program (${baseline.statistics.medianMs.toFixed(3)}ms); what is left is mostly start-up noise`,
		});
	}

	if (baseline?.subtracted === true) {
		warnings.push({
			kind: "spawn-baseline-subtracted",
			severity: "info",
			message: `${baseline.statistics.medianMs.toFixed(3)}ms of start-up was removed from every sample behind the adjusted figure`,
		});
	}

	if (
		statistics.outlierIndices.length >
		statistics.samples * OUTLIER_FRACTION
	) {
		const percent = (
			(statistics.outlierIndices.length / statistics.samples) *
			100
		).toFixed(0);
		warnings.push({
			kind: "outliers",
			message: `${percent}% of samples are statistical outliers; the distribution is heavy-tailed (GC pauses or scheduler preemption): prefer median over the mean`,
		});
	}

	const first = timings[0];
	if (
		first !== undefined &&
		statistics.medianMs > 0 &&
		first >= statistics.maxMs &&
		first > statistics.medianMs * FIRST_RUN_SLOW_FACTOR
	) {
		warnings.push({
			kind: "first-run-slow",
			message: `first sample was the slowest of all and ${(first / statistics.medianMs).toFixed(1)}x the median; consider increasing warmup`,
		});
	}

	if (statistics.relativeMad > HIGH_VARIANCE) {
		warnings.push({
			kind: "high-variance",
			message: `median absolute deviation is ${(statistics.relativeMad * 100).toFixed(0)}% of the median; treat small differences as noise`,
		});
	}

	if (
		overheadMs > 0 &&
		statistics.medianMs > 0 &&
		overheadMs / statistics.medianMs > OVERHEAD_DOMINATES
	) {
		warnings.push({
			kind: "overhead-dominates",
			message: `fixed overhead is ${((overheadMs / statistics.medianMs) * 100).toFixed(0)}% of the measurement; compare the adjusted column`,
		});
	}

	return warnings;
}
