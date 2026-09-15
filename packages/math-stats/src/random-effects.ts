import { map, sumPrecise } from "@ac-kit/core";

import { ConfidenceInterval } from "./confidence-interval.js";
import { normalQuantile } from "./normal-quantile.js";

/** One group's estimate and the variance of that estimate. */
export type RandomEffectsGroup = {
	readonly estimate: number;
	/** Variance **of the estimate**, not of the underlying samples. */
	readonly variance: number;
};

export type PooledEstimate = {
	readonly estimate: number;
	readonly interval: ConfidenceInterval;
	/** Between-group variance component, τ². Zero when groups agree. */
	readonly betweenVariance: number;
	/**
	 * Fraction of total variance attributable to between-group differences, I².
	 *
	 * Zero when the spread between groups is no more than their own uncertainty
	 * already explains; near one when the groups disagree far beyond it.
	 */
	readonly heterogeneity: number;
	readonly groups: number;
};

/**
 * Pool estimates from several groups under a random-effects model, by the
 * DerSimonian–Laird method.
 *
 * Use this when each group is one draw from a population of contexts rather
 * than a repeat of the same measurement: separate processes, machines or
 * sessions. A fixed-effect average would treat the between-group spread as if
 * it did not exist and report an interval far too narrow; this estimates that
 * spread as τ² and widens the interval by it.
 *
 * With one group there is no between-group spread to estimate, and the result
 * is that group's own estimate and interval.
 *
 * O(k) in the number of groups.
 *
 * @param groups One entry per group. Not modified.
 * @param level Confidence level in `(0, 1)`. Default `0.95`.
 * @returns The pooled estimate, its interval, and how much the groups
 *   disagreed.
 * @throws {RangeError} When `groups` is empty, when any variance is not a
 *   positive finite number, or when `level` is outside `(0, 1)`.
 */
export function poolRandomEffects(
	groups: readonly RandomEffectsGroup[],
	level = 0.95,
): PooledEstimate {
	if (groups.length === 0) {
		throw new RangeError("poolRandomEffects: at least one group is required");
	}

	if (level <= 0 || level >= 1) {
		throw new RangeError("poolRandomEffects: level must be in (0, 1)");
	}

	for (const group of groups) {
		// A zero-variance group would claim infinite precision and take the whole
		// weight. It never means that: it means the estimate was quantised by a
		// coarse clock, and the caller has to decide what to do about it.
		if (!Number.isFinite(group.variance) || group.variance <= 0) {
			throw new RangeError(
				"poolRandomEffects: every group variance must be positive and finite",
			);
		}
	}

	const betweenVariance = betweenGroupVariance_(groups);

	// Inverse-variance weights routinely span several orders of magnitude, which
	// is where a naive running total drops the small ones entirely.
	const weights = groups.map((group) => 1 / (group.variance + betweenVariance));
	const weightSum = sumPrecise(weights);
	const weightedSum = sumPrecise(
		map(groups, (group, index) => weights[index]! * group.estimate),
	);

	const estimate = weightedSum / weightSum;
	const halfWidth = normalQuantile((1 + level) / 2) / Math.sqrt(weightSum);

	return {
		estimate,
		interval: {
			estimate,
			lower: estimate - halfWidth,
			upper: estimate + halfWidth,
			halfWidth,
			level,
		},
		betweenVariance,
		heterogeneity: heterogeneity_(groups),
		groups: groups.length,
	};
}

/**
 * τ², the excess of Cochran's Q over its expectation under homogeneity,
 * rescaled to a variance. Truncated at zero: a negative estimate means the
 * groups agree more closely than chance alone predicts, not that the variance
 * is negative.
 */
function betweenGroupVariance_(groups: readonly RandomEffectsGroup[]): number {
	if (groups.length < 2) {
		return 0;
	}

	const { q, weightSum, weightSquaredSum } = cochranQ_(groups);
	const scale = weightSum - weightSquaredSum / weightSum;

	return scale <= 0 ? 0 : Math.max(0, (q - (groups.length - 1)) / scale);
}

/** I², the share of total variation that is between groups rather than within. */
function heterogeneity_(groups: readonly RandomEffectsGroup[]): number {
	if (groups.length < 2) {
		return 0;
	}

	const { q } = cochranQ_(groups);

	return q <= 0 ? 0 : Math.max(0, (q - (groups.length - 1)) / q);
}

/** Weighted spread of the group estimates around their fixed-effect average. */
function cochranQ_(groups: readonly RandomEffectsGroup[]): {
	q: number;
	weightSum: number;
	weightSquaredSum: number;
} {
	const weights = groups.map((group) => 1 / group.variance);
	const weightSum = sumPrecise(weights);
	const weightSquaredSum = sumPrecise(
		map(weights, (weight) => weight * weight),
	);
	const weightedSum = sumPrecise(
		map(groups, (group, index) => weights[index]! * group.estimate),
	);

	const fixedEffect = weightedSum / weightSum;
	const q = sumPrecise(
		map(groups, (group) => {
			const deviation = group.estimate - fixedEffect;

			return (deviation * deviation) / group.variance;
		}),
	);

	return { q, weightSum, weightSquaredSum };
}
