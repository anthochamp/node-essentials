import { map, sumPrecise } from "@ac-kit/core";

import { mean } from "./average.js";
import { quantile } from "./quantile.js";

/**
 * Variance of a sample, with Bessel's correction.
 *
 * Use this when the values are a sample drawn from a larger process, which is
 * the usual case for measurements. See {@link populationVariance} when the
 * values are the entire population.
 *
 * @param values The sample. Not modified.
 * @returns The variance, or `0` for a sample of fewer than two values.
 */
export function sampleVariance(values: readonly number[]): number {
	const count = values.length;
	if (count < 2) {
		return 0;
	}

	return sumPrecise(squaredDeviations_(values)) / (count - 1);
}

/**
 * Variance of a complete population.
 *
 * @param values The population. Not modified.
 * @returns The variance, or `NaN` for an empty population.
 */
export function populationVariance(values: readonly number[]): number {
	const count = values.length;
	if (count === 0) {
		return Number.NaN;
	}

	return sumPrecise(squaredDeviations_(values)) / count;
}

// Exact summation is not optional here: deviations straddle zero, so a naive
// running total can cancel away every significant bit of a small variance.
function squaredDeviations_(values: readonly number[]): Iterable<number> {
	const average = mean(values);

	return map(values, (value) => (value - average) ** 2);
}

/**
 * Standard deviation of a sample, with Bessel's correction.
 *
 * @param values The sample. Not modified.
 * @returns The standard deviation.
 */
export function sampleStandardDeviation(values: readonly number[]): number {
	return Math.sqrt(sampleVariance(values));
}

/**
 * Standard deviation of a complete population.
 *
 * @param values The population. Not modified.
 * @returns The standard deviation.
 */
export function populationStandardDeviation(values: readonly number[]): number {
	return Math.sqrt(populationVariance(values));
}

/**
 * Median absolute deviation — the median of the absolute deviations from the
 * median.
 *
 * A dispersion measure that a handful of extreme values cannot inflate, unlike
 * the standard deviation.
 *
 * @param values The sample. Not modified.
 * @param center Precomputed median, when the caller already has one.
 * @returns The median absolute deviation, or `NaN` for an empty sample.
 */
export function medianAbsoluteDeviation(
	values: readonly number[],
	center?: number,
): number {
	if (values.length === 0) {
		return Number.NaN;
	}

	const sorted = [...values].sort((left, right) => left - right);
	const middle = center ?? quantile(sorted, 0.5);
	const deviations = sorted
		.map((value) => Math.abs(value - middle))
		.sort((left, right) => left - right);
	return quantile(deviations, 0.5);
}
