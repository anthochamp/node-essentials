import { MeasureExecution } from "@ac-bench/core/plugin";
import { CentralEstimator } from "@ac-bench/core/runner";
import {
	ConfidenceInterval,
	poolRandomEffects,
	sumBy,
} from "@ac-kit/math-stats";
import * as z from "zod/mini";

import { DurationSamplingReport } from "./_sampling-report.js";
import { summarise } from "./_statistics.js";
import { DurationBenchRunCaseResult } from "./_types.js";

/**
 * Normal quantile for a two-sided 95% interval, matching what `summarise`
 * reports.
 */
const Z_95_ = 1.959_964;

export const pooledEstimateSchema = z.object({
	/** The answer: every execution's estimate, weighted by its precision. */
	estimateMs: z.number(),
	lowerMs: z.number(),
	upperMs: z.number(),
	/** Between-process variance, τ². The process lottery, quantified. */
	betweenVarianceMs2: z.number(),
	/** Share of total variance that is between processes rather than within. */
	heterogeneity: z.number(),
	/** How many executions were combined. */
	executions: z.number(),
	/** Which of the reported statistics was pooled. */
	estimator: z.enum(["mean", "median"]),
});
export type PooledEstimate = z.infer<typeof pooledEstimateSchema>;

export const contaminationSchema = z.object({
	/** Shared-arm estimate minus isolated-arm estimate, in milliseconds. */
	differenceMs: z.number(),
	/** As a fraction of the isolated estimate. */
	share: z.number(),
	/** Executions behind each side. */
	sharedExecutions: z.number(),
	isolatedExecutions: z.number(),
});
export type Contamination = z.infer<typeof contaminationSchema>;

/**
 * Combines every execution of one case into the result that answers for it.
 *
 * Executions come from different processes, and a process contributes an offset
 * of its own — GC seed, address-space layout, which JIT tier the code settled
 * in, the thermal state at that moment. Averaging the estimates would report an
 * interval far too narrow, because it would treat that offset as if it did not
 * exist. Random-effects pooling estimates it instead and widens the interval by
 * it.
 *
 * The pooled interval is symmetric by construction, which is inverse-variance
 * pooling's assumption rather than a property of the samples: a skewed median
 * interval is symmetrised on the way in.
 *
 * @param executions At least one, in no particular order.
 * @param estimator Which reported statistic to pool.
 * @returns The pooled result, or the sole execution's own result when there is
 *   only one.
 */
export function poolDurationExecutions(
	executions: readonly MeasureExecution<DurationBenchRunCaseResult>[],
	estimator: CentralEstimator = "median",
): DurationBenchRunCaseResult {
	const measured = executions.filter(
		(execution) => execution.result.statistics !== null,
	);

	// Every execution failed, or there was only ever one: nothing to combine, and
	// inventing a pooled number over a single group would only look authoritative.
	if (measured.length === 0) {
		return executions[0]!.result;
	}

	if (measured.length === 1) {
		return measured[0]!.result;
	}

	const groups = measured.map((execution) => ({
		estimate: estimate_(execution.result, estimator),
		variance: variance_(execution.result, estimator),
	}));

	// A clock too coarse to separate the samples leaves nothing to weight by.
	if (groups.some((group) => group.variance <= 0)) {
		return mergeSamples_(measured, estimator, null, null);
	}

	const pooled = poolRandomEffects(groups);

	return mergeSamples_(
		measured,
		estimator,
		{
			estimateMs: pooled.estimate,
			lowerMs: pooled.interval.lower,
			upperMs: pooled.interval.upper,
			betweenVarianceMs2: pooled.betweenVariance,
			heterogeneity: pooled.heterogeneity,
			executions: measured.length,
			estimator,
		},
		contamination_(measured, estimator),
	);
}

/**
 * Builds the pooled result on the concatenated samples.
 *
 * The reported `statistics` describe every sample from every execution, so the
 * spread they show includes the between-process spread rather than one lucky
 * process's view of it. `estimate` carries the properly weighted answer.
 */
function mergeSamples_(
	executions: readonly MeasureExecution<DurationBenchRunCaseResult>[],
	estimator: CentralEstimator,
	estimate: PooledEstimate | null,
	contamination: Contamination | null,
): DurationBenchRunCaseResult {
	const first = executions[0]!.result;
	const timings = executions.flatMap((execution) => execution.result.timings);

	return {
		...first,
		statistics: timings.length > 0 ? summarise(timings) : first.statistics,
		timings,
		sampling: mergeSampling_(executions, estimate),
		estimate,
		contamination,
		warnings: dedupeWarnings_(executions),
	};
}

/**
 * One report describing every execution.
 *
 * Carrying the first execution's report unchanged would state one process's
 * sample count and precision next to statistics covering all of them.
 */
function mergeSampling_(
	executions: readonly MeasureExecution<DurationBenchRunCaseResult>[],
	estimate: PooledEstimate | null,
): DurationSamplingReport | null {
	const reports = executions
		.map((execution) => execution.result.sampling)
		.filter((report) => report !== null);

	const first = reports[0];

	if (first === undefined) {
		return null;
	}

	const stopReasons = new Set(reports.map((report) => report.stopReason));
	const achieved = estimate === null ? null : pooledRelativeError_(estimate);

	return {
		...first,
		// A claim about precision is the weakest link: one precise replicate must
		// not cover for four sloppy ones.
		targetReached: reports.every((report) => report.targetReached),
		achievedRelativeError: achieved ?? first.achievedRelativeError,
		stopReason: stopReasons.size === 1 ? first.stopReason : "mixed",
		measuredMs: sumBy(reports, (report) => report.measuredMs),
		activeMs: sumBy(reports, (report) => report.activeMs),
		elapsedMs: sumBy(reports, (report) => report.elapsedMs),
		samples: sumBy(reports, (report) => report.samples),
		batches: sumBy(reports, (report) => report.batches),
	};
}

/** Half-width of the pooled interval, relative to the pooled estimate. */
function pooledRelativeError_(estimate: PooledEstimate): number | null {
	if (estimate.estimateMs <= 0) {
		return null;
	}

	return (estimate.upperMs - estimate.lowerMs) / 2 / estimate.estimateMs;
}

/**
 * One warning per kind, with how many executions raised it.
 *
 * Keying on the message would keep all of them: each quotes its own numbers, so
 * eight executions produce eight distinct texts saying the same thing. The
 * retained message is one execution's, and the count is what says whether the
 * finding was systematic or a one-off.
 */
function dedupeWarnings_(
	executions: readonly MeasureExecution<DurationBenchRunCaseResult>[],
): DurationBenchRunCaseResult["warnings"] {
	const byKind = new Map<
		string,
		{ warning: DurationBenchRunCaseResult["warnings"][number]; seen: number }
	>();

	for (const execution of executions) {
		for (const warning of execution.result.warnings) {
			const existing = byKind.get(warning.kind);

			if (existing === undefined) {
				byKind.set(warning.kind, { warning, seen: 1 });
				continue;
			}

			existing.seen += 1;
		}
	}

	const total = executions.length;

	return [...byKind.values()].map(({ warning, seen }) =>
		seen === 1 && total === 1
			? warning
			: {
					...warning,
					message: `${warning.message} (in ${seen} of ${total} executions)`,
				},
	);
}

/**
 * How much slower a case runs alongside its siblings than alone.
 *
 * `null` unless both arms ran: with one arm there is nothing to compare, and a
 * difference of an estimate against itself is zero by construction rather than
 * by measurement.
 */
function contamination_(
	executions: readonly MeasureExecution<DurationBenchRunCaseResult>[],
	estimator: CentralEstimator,
): Contamination | null {
	const shared = executions.filter((execution) => execution.arm === "shared");
	const isolated = executions.filter(
		(execution) => execution.arm === "isolated",
	);

	if (shared.length === 0 || isolated.length === 0) {
		return null;
	}

	const sharedMs = meanEstimate_(shared, estimator);
	const isolatedMs = meanEstimate_(isolated, estimator);

	return {
		differenceMs: sharedMs - isolatedMs,
		share: isolatedMs > 0 ? (sharedMs - isolatedMs) / isolatedMs : 0,
		sharedExecutions: shared.length,
		isolatedExecutions: isolated.length,
	};
}

function meanEstimate_(
	executions: readonly MeasureExecution<DurationBenchRunCaseResult>[],
	estimator: CentralEstimator,
): number {
	const total = executions.reduce(
		(sum, execution) => sum + estimate_(execution.result, estimator),
		0,
	);

	return total / executions.length;
}

function estimate_(
	result: DurationBenchRunCaseResult,
	estimator: CentralEstimator,
): number {
	const statistics = result.statistics!;

	return estimator === "mean" ? statistics.meanMs : statistics.medianMs;
}

/**
 * Variance of the estimate, from the interval the sampler already reports.
 *
 * `halfWidth = z · σ`, so `σ² = (halfWidth / z)²` — exact for the mean's normal
 * approximation, and the closest honest reading of the median's
 * distribution-free interval.
 */
function variance_(
	result: DurationBenchRunCaseResult,
	estimator: CentralEstimator,
): number {
	const statistics = result.statistics!;
	const halfWidth =
		estimator === "mean"
			? statistics.confidence95Ms
			: statistics.medianConfidence95Ms;

	return (halfWidth / Z_95_) ** 2;
}

/** An interval a reader can quote, from the pooled estimate. */
export function pooledInterval(estimate: PooledEstimate): ConfidenceInterval {
	return {
		estimate: estimate.estimateMs,
		lower: estimate.lowerMs,
		upper: estimate.upperMs,
		halfWidth: (estimate.upperMs - estimate.lowerMs) / 2,
		level: 0.95,
	};
}
