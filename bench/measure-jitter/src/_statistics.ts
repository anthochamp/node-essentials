import {
	linearRegressionSlope,
	mean,
	quantile,
	sumBy,
} from "@ac-kit/math-stats";

/** Descriptive statistics for a set of signed lateness samples. */
export interface JitterBenchStatistics {
	samples: number;

	meanMs: number;
	medianMs: number;
	minMs: number;
	maxMs: number;

	/**
	 * Mean of the absolute lateness.
	 *
	 * A timer that is 5 ms early half the time and 5 ms late the other half has a
	 * mean of zero and is not accurate; this says so.
	 */
	meanAbsoluteMs: number;

	p90Ms: number;

	/** The far tail, which is what a deadline actually has to survive. */
	p99Ms: number;

	/**
	 * Lateness accumulated per second of elapsed time, from a least-squares fit.
	 *
	 * Near zero means the implementation recomputes each deadline from a fixed
	 * origin. A positive slope means it schedules the next firing relative to the
	 * previous one, so every firing inherits the error of the one before it.
	 */
	driftMsPerSecond: number;

	/** Firings so late that a whole period was lost. */
	overruns: number;
}

/**
 * Summarise signed lateness samples.
 *
 * @param samples Lateness in milliseconds, in firing order. Positive is late.
 * @param periodMs Nominal period, used to convert sample index to elapsed time.
 * @returns The computed statistics.
 * @throws {RangeError} If `samples` is empty.
 */
export function composeJitterBenchStatistics(
	samples: readonly number[],
	periodMs: number,
): JitterBenchStatistics {
	if (samples.length === 0) {
		throw new RangeError("Cannot summarise an empty sample set");
	}

	const sorted = [...samples].sort((left, right) => left - right);
	const count = sorted.length;

	return {
		samples: count,
		meanMs: mean(sorted),
		medianMs: quantile(sorted, 0.5),
		minMs: sorted[0]!,
		maxMs: sorted[count - 1]!,
		meanAbsoluteMs: sumBy(sorted, Math.abs) / count,
		p90Ms: quantile(sorted, 0.9),
		p99Ms: quantile(sorted, 0.99),
		driftMsPerSecond: driftMsPerSecond_(samples, periodMs),
		overruns: samples.filter((value) => value >= periodMs).length,
	};
}

/**
 * Slope of lateness against elapsed time, by ordinary least squares.
 *
 * @param samples Lateness in milliseconds, in firing order.
 * @param periodMs Nominal period, so that sample `n` is at `n × periodMs`.
 * @returns Milliseconds of lateness gained per second elapsed.
 */
function driftMsPerSecond_(
	samples: readonly number[],
	periodMs: number,
): number {
	if (periodMs <= 0) {
		return 0;
	}

	// x is elapsed milliseconds, so the raw slope is dimensionless; ×1000 makes
	// it milliseconds per second, which is the unit people reason in.
	const elapsedMs = samples.map((_, index) => index * periodMs);
	return linearRegressionSlope(elapsedMs, samples) * 1000;
}
