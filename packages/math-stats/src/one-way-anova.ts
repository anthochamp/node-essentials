import { PreciseSum } from "@ac-kit/core";

import { mean } from "./average.js";
import { fDistribution } from "./f-distribution.js";

/** A one-way ANOVA's statistic and the evidence against the null. */
export type OneWayAnovaResult = {
	/** The F ratio: between-group mean square over within-group mean square. */
	statistic: number;

	/** `groups − 1`. */
	numeratorDegreesOfFreedom: number;

	/** `observations − groups`. */
	denominatorDegreesOfFreedom: number;

	/** Probability of an F ratio at least this large under the null. */
	pValue: number;
};

/**
 * One-way analysis of variance: whether several groups share a common mean.
 *
 * The two sums of squares are accumulated exactly. Their terms are deviations
 * from a mean, so they straddle zero by construction and a naive running total
 * can cancel away every significant bit of either accumulator — the same reason
 * `linearRegressionSlope` compensates.
 *
 * Named `oneWayAnova` rather than `anova` because the one-way layout is a
 * genuine restriction, not an implementation detail: a two-way or repeated
 * measures design takes a different input shape and answers a different
 * question, and would be a different function rather than an option here.
 *
 * @param groups One array of observations per group. Not modified.
 * @returns The F ratio, its two degrees of freedom and the p-value.
 * @throws {RangeError} When there are fewer than two groups, any group is
 *   empty, or there are no more observations than groups.
 */
export function oneWayAnova(
	groups: readonly (readonly number[])[],
): OneWayAnovaResult {
	if (groups.length < 2) {
		throw new RangeError("oneWayAnova: need at least two groups");
	}

	let observations = 0;
	const grandTotal = new PreciseSum();
	for (const [index, group] of groups.entries()) {
		if (group.length === 0) {
			throw new RangeError(`oneWayAnova: group ${index} is empty`);
		}
		observations += group.length;
		for (const value of group) {
			grandTotal.add(value);
		}
	}

	const denominatorDegreesOfFreedom = observations - groups.length;
	if (denominatorDegreesOfFreedom < 1) {
		throw new RangeError("oneWayAnova: need more observations than groups");
	}

	const grandMean = grandTotal.value / observations;
	const between = new PreciseSum();
	const within = new PreciseSum();

	for (const group of groups) {
		const groupMean = mean(group);
		const shift = groupMean - grandMean;
		between.add(group.length * shift * shift);

		for (const value of group) {
			const deviation = value - groupMean;
			within.add(deviation * deviation);
		}
	}

	const numeratorDegreesOfFreedom = groups.length - 1;
	const withinMeanSquare = within.value / denominatorDegreesOfFreedom;
	// Every observation in a group identical leaves no within-group variation,
	// so the ratio is undefined rather than infinite.
	const statistic =
		withinMeanSquare > 0
			? between.value / numeratorDegreesOfFreedom / withinMeanSquare
			: Number.NaN;

	return {
		statistic,
		numeratorDegreesOfFreedom,
		denominatorDegreesOfFreedom,
		pValue: Number.isNaN(statistic)
			? Number.NaN
			: fDistribution(
					numeratorDegreesOfFreedom,
					denominatorDegreesOfFreedom,
				).survival(statistic),
	};
}
