import { mean } from "./average.js";
import { sampleStandardDeviation } from "./dispersion.js";
import { normalQuantile } from "./normal-quantile.js";
import { quantile } from "./quantile.js";

/** An interval estimate around a point estimate, at a confidence level. */
export type ConfidenceInterval = {
	/** The point estimate the interval is about. */
	readonly estimate: number;

	/** Lower bound of the interval. */
	readonly lower: number;

	/** Upper bound of the interval. */
	readonly upper: number;

	/**
	 * `(upper - lower) / 2`. Only equals the distance from
	 * {@link ConfidenceInterval.estimate} to either bound when the interval is
	 * symmetric about it.
	 */
	readonly halfWidth: number;

	/** The confidence level the interval was computed at, e.g. `0.95`. */
	readonly level: number;
};

/**
 * Normal-approximation confidence interval for the mean of a sample: `mean ± z
 * · s / √n`, with `z` the `(1 + level) / 2` standard normal quantile and `s`
 * the sample standard deviation.
 *
 * The approximation assumes the sampling distribution of the mean is close to
 * normal — fine for a symmetric or mildly skewed sample of reasonable size,
 * optimistic for the heavy right tail timing measurements usually have. See
 * {@link medianConfidenceInterval} for a distribution-free alternative.
 *
 * O(n).
 *
 * @param values The sample. Not modified.
 * @param level Confidence level in `(0, 1)`. Default `0.95`.
 * @returns The interval, centered on the sample mean.
 * @throws {RangeError} When the sample has fewer than two values, or `level` is
 *   outside `(0, 1)`.
 */
export function meanConfidenceInterval(
	values: readonly number[],
	level = 0.95,
): ConfidenceInterval {
	if (values.length < 2) {
		throw new RangeError(
			"meanConfidenceInterval: the sample must have at least two values",
		);
	}
	checkConfidenceLevel(level);

	const estimate = mean(values);
	const standardError =
		sampleStandardDeviation(values) / Math.sqrt(values.length);
	const halfWidth = normalQuantile((1 + level) / 2) * standardError;

	return {
		estimate,
		lower: estimate - halfWidth,
		upper: estimate + halfWidth,
		halfWidth,
		level,
	};
}

/**
 * Distribution-free confidence interval for the median of an already-sorted
 * sample, bounded by the pair of order statistics whose ranks bracket the
 * median with at least the requested confidence (normal approximation to the
 * binomial rank bounds).
 *
 * Unlike {@link meanConfidenceInterval}, no distributional assumption is made:
 * both bounds are actual sample values, which is what makes this robust to the
 * heavy right tail benchmark timings always have. The bounds are not generally
 * symmetric about the estimate, so `estimate ± halfWidth` does not reproduce
 * them.
 *
 * A sample can be too small for the level to be reachable at all — the widest
 * possible interval spans only `1 - 2^-(n-1)` — in which case the whole sample
 * is returned as the interval. At `n = 1` that is a single point.
 *
 * O(1) — the input is already sorted.
 *
 * @param sorted The sample, in ascending order. Not modified, not re-checked.
 * @param level Confidence level in `(0, 1)`. Default `0.95`.
 * @returns The interval, estimating the sample median.
 * @throws {RangeError} When the sample is empty, or `level` is outside `(0,
 *   1)`.
 */
export function medianConfidenceInterval(
	sorted: readonly number[],
	level = 0.95,
): ConfidenceInterval {
	if (sorted.length === 0) {
		throw new RangeError(
			"medianConfidenceInterval: the sample must not be empty",
		);
	}
	checkConfidenceLevel(level);

	const count = sorted.length;
	const estimate = quantile(sorted, 0.5);

	// The count of observations below the true median is Binomial(n, 1/2),
	// approximated as normal with mean n/2 and standard deviation √n/2. The
	// upper rank is the lower rank's mirror rather than the same expression
	// with the sign flipped: rounding each end independently loses the
	// symmetry the procedure has, and truncates the interval by one rank.
	const spread = (normalQuantile((1 + level) / 2) * Math.sqrt(count)) / 2;
	const lowerRank = Math.max(1, Math.floor(count / 2 - spread));
	const upperRank = Math.min(count, count + 1 - lowerRank);
	const lower = sorted[lowerRank - 1]!;
	const upper = sorted[upperRank - 1]!;

	return {
		estimate,
		lower,
		upper,
		halfWidth: (upper - lower) / 2,
		level,
	};
}

function checkConfidenceLevel(level: number): void {
	if (!(level > 0 && level < 1)) {
		throw new RangeError(
			`the confidence level must be in (0, 1), got ${level}`,
		);
	}
}
