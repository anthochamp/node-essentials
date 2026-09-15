import { medianAbsoluteDeviation } from "./dispersion.js";
import { quantile } from "./quantile.js";
import { sumBy } from "./sum.js";

/**
 * Consistency constant relating the median absolute deviation to the standard
 * deviation of a normal distribution, used by the modified Z-score.
 */
export const MAD_TO_SIGMA = 0.6745;

/** Conventional modified Z-score cutoff for outlier classification. */
export const DEFAULT_OUTLIER_THRESHOLD = 3.5;

/**
 * Flag values unlikely to belong to the same distribution as the rest.
 *
 * Uses the modified Z-score, built on the median and the median absolute
 * deviation. A plain Z-score is unusable for this: a single extreme value
 * inflates the standard deviation enough to hide itself.
 *
 * @param values The sample, in collection order. Not modified.
 * @param threshold Modified Z-score cutoff.
 * @returns Indices into `values`, in ascending order.
 */
export function findOutliers(
	values: readonly number[],
	threshold: number = DEFAULT_OUTLIER_THRESHOLD,
): number[] {
	if (values.length < 3) {
		return [];
	}

	const sorted = [...values].sort((left, right) => left - right);
	const middle = quantile(sorted, 0.5);
	let deviation = medianAbsoluteDeviation(sorted, middle);

	if (deviation === 0) {
		// A degenerate MAD means over half the values are identical; fall back to
		// the mean absolute deviation so genuine spikes are still detected.
		deviation =
			sumBy(values, (value) => Math.abs(value - middle)) /
			values.length /
			MAD_TO_SIGMA;
	}
	if (deviation === 0) {
		return [];
	}

	const indices: number[] = [];
	for (let index = 0; index < values.length; index++) {
		const score = (MAD_TO_SIGMA * (values[index]! - middle)) / deviation;
		if (Math.abs(score) > threshold) {
			indices.push(index);
		}
	}
	return indices;
}
