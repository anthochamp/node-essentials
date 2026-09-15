import {
	DEFAULT_OUTLIER_THRESHOLD,
	findOutliers,
	mean,
	medianAbsoluteDeviation,
	medianConfidenceInterval,
	quantile,
	ratioWithUncertainty,
	type RatioWithUncertainty,
	sampleStandardDeviation,
} from "@ac-kit/math-stats";

import { DurationStatistics } from "./_statistics-schema.js";

/** Normal quantile for a two-sided 95% interval. */
const Z_95 = 1.959_964;

/**
 * Compute descriptive statistics for a set of timings.
 *
 * @param samples Durations in milliseconds. Not modified.
 * @param outlierThreshold Modified Z-score above which a sample is flagged.
 * @returns The computed statistics.
 * @throws {RangeError} If `samples` is empty.
 */
export function summarise(
	samples: readonly number[],
	outlierThreshold: number = DEFAULT_OUTLIER_THRESHOLD,
): DurationStatistics {
	if (samples.length === 0) {
		throw new RangeError("Cannot summarise an empty sample set");
	}

	const sorted = [...samples].sort((left, right) => left - right);
	const count = sorted.length;
	const meanMs = mean(sorted);
	const stdDevMs = sampleStandardDeviation(sorted);
	const medianMs = quantile(sorted, 0.5);
	const madMs = medianAbsoluteDeviation(sorted, medianMs);

	return {
		samples: count,
		meanMs,
		stdDevMs,
		confidence95Ms: count > 1 ? (Z_95 * stdDevMs) / Math.sqrt(count) : 0,
		medianMs,
		medianConfidence95Ms: medianHalfWidth_(sorted),
		madMs,
		minMs: sorted[0]!,
		maxMs: sorted[count - 1]!,
		p95Ms: quantile(sorted, 0.95),
		p99Ms: quantile(sorted, 0.99),
		relativeStdDev: meanMs > 0 ? stdDevMs / meanMs : 0,
		relativeMad: medianMs > 0 ? madMs / medianMs : 0,
		outlierIndices: findOutliers(samples, outlierThreshold),
		// An overhead correction can legitimately drive the mean to zero or below,
		// and there is no rate to report when it does.
		opsPerSecond: meanMs > 0 ? 1000 / meanMs : null,
	};
}

/**
 * Ratio of two measurements with propagated uncertainty.
 *
 * Reporting `2.4x` without an error term invites reading noise as signal, so
 * the relative dispersions of both operands are combined.
 *
 * @param value Statistics for the measurement being compared.
 * @param baseline Statistics for the reference measurement.
 * @param basis Which central tendency to compare. `median` pairs with the
 *   median absolute deviation and is the robust choice.
 * @returns The ratio and its error margin.
 */
export function relativeTo(
	value: DurationStatistics,
	baseline: DurationStatistics,
	basis: "mean" | "median" = "median",
): RatioWithUncertainty {
	const centre = basis === "mean" ? "meanMs" : "medianMs";
	const spread = basis === "mean" ? "relativeStdDev" : "relativeMad";

	return ratioWithUncertainty(
		value[centre],
		value[spread],
		baseline[centre],
		baseline[spread],
	);
}

/**
 * Half-width of the distribution-free 95% interval around the median.
 *
 * A single sample has no spread to measure, so the interval collapses to zero
 * width rather than being undefined.
 */
function medianHalfWidth_(sorted: readonly number[]): number {
	if (sorted.length < 2) {
		return 0;
	}

	const interval = medianConfidenceInterval(sorted);

	return (interval.upper - interval.lower) / 2;
}
