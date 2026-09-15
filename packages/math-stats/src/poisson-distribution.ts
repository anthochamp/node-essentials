import {
	logGamma,
	regularizedIncompleteGamma,
	regularizedIncompleteGammaUpper,
} from "@ac-kit/math-analysis";

import { assertProbability_ } from "./_assert-probability.js";
import { discreteQuantile_ } from "./_discrete-quantile.js";
import { inverseTransformSample_ } from "./_inverse-transform-sample.js";
import type { Distribution } from "./distribution.js";

/**
 * The Poisson distribution — the number of events in a fixed interval when they
 * arrive independently at a constant average `rate`.
 *
 * Both tails come from the incomplete gamma by the exact identity `P(X ≤ k) =
 * Q(k + 1, λ)`, so neither is a sum of terms and neither is reached by
 * subtracting the other.
 *
 * @param rate Expected number of events; must be positive.
 * @returns The distribution.
 * @throws {RangeError} When `rate` is not positive.
 */
export function poissonDistribution(rate: number): Distribution {
	if (!(rate > 0)) {
		throw new RangeError(
			`poissonDistribution: rate must be positive, got ${rate}`,
		);
	}

	const cdf = (x: number) => {
		const events = Math.floor(x);

		return events < 0 ? 0 : regularizedIncompleteGammaUpper(events + 1, rate);
	};

	const quantile = (probability: number) => {
		assertProbability_("poissonDistribution", probability);

		return discreteQuantile_(cdf, probability, 0, Number.POSITIVE_INFINITY);
	};

	return {
		density: (x) =>
			Number.isInteger(x) && x >= 0
				? Math.exp(-rate + x * Math.log(rate) - logGamma(x + 1))
				: 0,
		cdf,
		survival: (x) => {
			const events = Math.floor(x);

			return events < 0 ? 1 : regularizedIncompleteGamma(events + 1, rate);
		},
		quantile,
		sample: (random) => inverseTransformSample_(quantile, random),
		mean: rate,
		variance: rate,
	};
}
