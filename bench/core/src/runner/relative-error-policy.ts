import { clamp, round } from "@ac-kit/core";
import {
	ConfidenceInterval,
	meanConfidenceInterval,
	medianAbsoluteDeviation,
	medianConfidenceInterval,
	normalQuantile,
	quantile,
} from "@ac-kit/math-stats";

import { StoppingDecision, StoppingPolicy } from "./sampler.js";

export type RelativeErrorTarget = number | "auto" | "off";
export type CentralEstimator = "mean" | "median";

/**
 * What {@link createRelativeErrorPolicy} reads from a measure's own sampling
 * options.
 *
 * Structural rather than a base to extend, so a measure keeps naming its
 * options after what it measures and passes them straight in.
 */
export type RelativeErrorOptions = {
	/** Lower bound on measured iterations, which also floors the pilot. */
	readonly minRuns: number;

	/**
	 * How tight the confidence interval must be, relative to the estimate, before
	 * sampling stops.
	 *
	 * `"auto"` derives a target from the spread observed on this machine for this
	 * case, so a noisy runner and a quiet workstation each get an appropriate
	 * one. `"off"` reproduces the fixed-bound loop exactly, which is what a
	 * differential or regression run wants.
	 */
	readonly relativeError: RelativeErrorTarget;

	/** Confidence level for the reported interval. */
	readonly confidenceLevel: number;

	readonly estimator: CentralEstimator;
};

export type RelativeErrorMetadata = {
	requestedRelativeError: RelativeErrorTarget;
	effectiveRelativeErrorTarget: number | null;
	achievedRelativeError: number | null;
	targetReached: boolean;
	confidenceLevel: number;
	estimator: CentralEstimator;
};

/** Below this, neither interval is meaningful and nothing is claimed. */
const MIN_SAMPLES_FOR_INTERVAL_ = 8;

/** How many times tighter than the observed spread `"auto"` aims, per mode. */
export const DEFAULT_AUTO_K = 4;

/** Where clock resolution dominates, and where a number stops distinguishing. */
const AUTO_FLOOR_ = 0.005;
const AUTO_CEILING_ = 0.05;

/**
 * Stops once the interval around the estimate is tight enough relative to the
 * estimate itself.
 *
 * Presumes noise, which is why a quantity that never varies needs
 * {@link createStabilityPolicy} instead: a confidence interval around a
 * deterministic counter is meaningless.
 */
export function createRelativeErrorPolicy(
	sampling: RelativeErrorOptions,
	autoK: number = DEFAULT_AUTO_K,
): StoppingPolicy<number, RelativeErrorMetadata> {
	// Derived once from the pilot, then held: the same pilot always yields the
	// same target, so a rerun is reproducible.
	let target: number | null = null;

	const pilotSamples = Math.max(sampling.minRuns, 20);

	const resolveTarget = (samples: readonly number[]): number | null => {
		if (sampling.relativeError === "off") {
			return null;
		}

		if (typeof sampling.relativeError === "number") {
			return sampling.relativeError;
		}

		target ??= autoTarget_(samples, autoK);

		return target;
	};

	const describe = (samples: readonly number[]): RelativeErrorMetadata => {
		const effective = resolveTarget(samples);
		const achieved = achievedRelativeError_(samples, sampling);

		return {
			requestedRelativeError: sampling.relativeError,
			effectiveRelativeErrorTarget: effective,
			achievedRelativeError: achieved,
			targetReached:
				effective !== null && achieved !== null && achieved <= effective,
			confidenceLevel: sampling.confidenceLevel,
			estimator: sampling.estimator,
		};
	};

	return {
		pilotSamples,

		evaluate: (samples): StoppingDecision => {
			// `"off"` reproduces the fixed-bound loop exactly: the floors are the
			// whole policy, which is what a regression run wants.
			if (sampling.relativeError === "off") {
				return { kind: "satisfied", reason: "min-time" };
			}

			const effective = resolveTarget(samples);
			const achieved = achievedRelativeError_(samples, sampling);

			if (effective === null || achieved === null) {
				return { kind: "continue" };
			}

			if (achieved <= effective) {
				return { kind: "satisfied" };
			}

			return {
				kind: "continue",
				suggestedSamples: suggestSamples_(samples, sampling, effective),
			};
		},

		describe,
	};
}

/**
 * `r / k` asks for an interval `k` times tighter than the sample-to-sample
 * spread — a demand scaled to this machine's noise rather than a fixed value
 * that a noisy runner could never reach.
 */
function autoTarget_(samples: readonly number[], autoK: number): number | null {
	if (samples.length < MIN_SAMPLES_FOR_INTERVAL_) {
		return null;
	}

	const sorted = [...samples].toSorted((a, b) => a - b);
	const median = quantile(sorted, 0.5);

	if (median <= 0) {
		return AUTO_CEILING_;
	}

	const relativeSpread = medianAbsoluteDeviation(samples) / median;

	// Two significant digits keep a recorded target readable and stable across
	// trivially different pilots.
	return clamp(
		round(relativeSpread / autoK, { significantDigits: 2 }),
		AUTO_FLOOR_,
		AUTO_CEILING_,
	);
}

function achievedRelativeError_(
	samples: readonly number[],
	sampling: RelativeErrorOptions,
): number | null {
	const interval = confidenceInterval_(samples, sampling);

	return interval === null || interval.estimate <= 0
		? null
		: interval.halfWidth / interval.estimate;
}

function confidenceInterval_(
	samples: readonly number[],
	sampling: RelativeErrorOptions,
): ConfidenceInterval | null {
	if (samples.length < MIN_SAMPLES_FOR_INTERVAL_) {
		return null;
	}

	if (sampling.estimator === "mean") {
		return meanConfidenceInterval(samples, sampling.confidenceLevel);
	}

	return medianConfidenceInterval(
		[...samples].toSorted((a, b) => a - b),
		sampling.confidenceLevel,
	);
}

/**
 * Predicted requirement, capped at doubling so one unlucky early estimate
 * cannot commit the run to a huge plan.
 */
function suggestSamples_(
	samples: readonly number[],
	sampling: RelativeErrorOptions,
	target: number,
): number {
	const sorted = [...samples].toSorted((a, b) => a - b);
	const median = quantile(sorted, 0.5);

	if (median <= 0 || target <= 0) {
		return samples.length;
	}

	const z = normalQuantile((1 + sampling.confidenceLevel) / 2);
	const relativeDispersion = medianAbsoluteDeviation(samples) / median;
	const required = Math.ceil(((z * relativeDispersion) / target) ** 2);

	return clamp(required - samples.length, 1, samples.length);
}
