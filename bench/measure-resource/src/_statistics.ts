import { maxBy } from "@ac-kit/algo";
import { Callable } from "@ac-kit/core";
import { median, sumBy } from "@ac-kit/math-stats";

import { ResourceBenchSample, ResourceBenchStatistics } from "./_types.js";

function medianBy_(
	samples: readonly ResourceBenchSample[],
	valueOf: Callable<[ResourceBenchSample], number>,
): number {
	return median(Array.from(samples, valueOf));
}

function maxValueBy_(
	samples: readonly ResourceBenchSample[],
	valueOf: Callable<[ResourceBenchSample], number>,
): number {
	const peak = maxBy(samples, valueOf);

	return peak === null ? 0 : valueOf(peak);
}

/**
 * Summarise per-batch resource samples.
 *
 * Rates are medians because a batch that happened to absorb a collection is a
 * heavy right tail, exactly as with timings. Peaks are maxima because the
 * question they answer is what had to fit in memory, not what typically did.
 *
 * @param samples Per-operation costs, one entry per batch.
 * @param heapLimitBytes The heap ceiling this process was given.
 * @returns The computed statistics.
 * @throws {RangeError} If `samples` is empty.
 */
export function composeResourceBenchStatistics(
	samples: readonly ResourceBenchSample[],
	heapLimitBytes: number,
): ResourceBenchStatistics {
	if (samples.length === 0) {
		throw new RangeError("Cannot summarise an empty sample set");
	}

	const cpuTimeMs = medianBy_(samples, (sample) => sample.cpuTimeMs);
	const heapPeakBytes = maxValueBy_(samples, (sample) => sample.heapPeakBytes);

	// One `null` means the runtime never reports collections, so the whole
	// series is absent rather than zero.
	const observedGc = samples[0]?.gcPauseMs !== null;

	const gcPauseMs = observedGc
		? medianBy_(samples, (sample) => sample.gcPauseMs ?? 0)
		: null;
	const gcCount = observedGc
		? medianBy_(samples, (sample) => sample.gcCount ?? 0)
		: null;

	// Ratios come from the totals rather than from the medians, so a collection
	// that landed in one batch is not divided by another batch's CPU time.
	const totalCpuTimeMs = sumBy(samples, (sample) => sample.cpuTimeMs);
	const totalGcPauseMs = sumBy(samples, (sample) => sample.gcPauseMs ?? 0);

	return {
		samples: samples.length,
		operations: sumBy(samples, (sample) => sample.operations),

		cpuTimeMs,
		allocatedBytes: medianBy_(samples, (sample) => sample.allocatedBytes),
		gcPauseMs,
		gcCount,

		heapPeakBytes,
		rssPeakBytes: maxValueBy_(samples, (sample) => sample.rssBytes),

		heapLimitRatio: heapLimitBytes > 0 ? heapPeakBytes / heapLimitBytes : 0,
		gcTimeRatio:
			observedGc && totalCpuTimeMs > 0 ? totalGcPauseMs / totalCpuTimeMs : null,
	};
}
