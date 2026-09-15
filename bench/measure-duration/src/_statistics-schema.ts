import * as z from "zod/mini";

/**
 * Descriptive statistics for a set of timing samples.
 *
 * Both a mean with dispersion and a median with percentiles are reported. The
 * mean is what most tools show and is comparable across runs; the median and
 * MAD are robust to the long right tail that dominates benchmarks involving
 * I/O, garbage collection or process scheduling.
 */
export const durationStatisticsSchema = z.object({
	/** Number of measured samples. */
	samples: z.number(),
	/** Arithmetic mean, in milliseconds. */
	meanMs: z.number(),
	/** Sample standard deviation (Bessel-corrected), in milliseconds. */
	stdDevMs: z.number(),
	/** Half-width of the 95% confidence interval of the mean. */
	confidence95Ms: z.number(),
	/** Median, in milliseconds. */
	medianMs: z.number(),
	/**
	 * Half-width of the 95% confidence interval of the median.
	 *
	 * Distribution-free, from the order statistics, so it does not assume the
	 * heavy right tail away the way the mean's normal approximation does. The
	 * underlying interval can be asymmetric about the median; this is half its
	 * total width, which is what combining executions needs.
	 */
	medianConfidence95Ms: z.number(),
	/**
	 * Median absolute deviation, in milliseconds. A dispersion measure that a
	 * handful of extreme samples cannot inflate.
	 */
	madMs: z.number(),
	/** Minimum sample, in milliseconds. */
	minMs: z.number(),
	/** Maximum sample, in milliseconds. */
	maxMs: z.number(),
	/** 95th percentile, in milliseconds. */
	p95Ms: z.number(),
	/** 99th percentile, in milliseconds. */
	p99Ms: z.number(),
	/** Standard deviation as a fraction of the mean. */
	relativeStdDev: z.number(),
	/**
	 * Median absolute deviation as a fraction of the median.
	 *
	 * The robust counterpart of {@link DurationStatistics.relativeStdDev}. Garbage
	 * collection and scheduler preemption give benchmark timings a heavy right
	 * tail, which inflates the standard deviation without saying anything about
	 * the typical case.
	 */
	relativeMad: z.number(),
	/** Indices of samples flagged by `findOutliers`. */
	outlierIndices: z.array(z.number()),
	/** Operations per second, derived from the mean. */
	opsPerSecond: z.nullable(z.number()),
});
export type DurationStatistics = z.infer<typeof durationStatisticsSchema>;
