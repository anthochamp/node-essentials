import { erfc } from "@ac-kit/math-analysis";
import { SQRT1_2, SQRT_TWO_PI } from "@ac-kit/math-scalar";

import { assertProbability_ } from "./_assert-probability.js";
import { inverseTransformSample_ } from "./_inverse-transform-sample.js";
import type { Distribution } from "./distribution.js";
import { normalQuantile } from "./normal-quantile.js";

/**
 * The normal (Gaussian) distribution.
 *
 * Both tails go through `erfc` rather than through one another: `cdf` uses the
 * reflected argument so the lower tail stays exact, and `survival` the direct
 * one. Computing either as `1 −` the other loses the whole answer beyond about
 * four standard deviations, which is where a p-value lives.
 *
 * @param mean Centre of the distribution.
 * @param standardDeviation Spread; must be positive.
 * @returns The distribution.
 * @throws {RangeError} When `standardDeviation` is not positive.
 */
export function normalDistribution(
	mean = 0,
	standardDeviation = 1,
): Distribution {
	if (!(standardDeviation > 0)) {
		throw new RangeError(
			`normalDistribution: standardDeviation must be positive, got ${standardDeviation}`,
		);
	}

	const standardise = (x: number) => (x - mean) / standardDeviation;

	const quantile = (probability: number) => {
		assertProbability_("normalDistribution", probability);

		return mean + standardDeviation * normalQuantile(probability);
	};

	return {
		density: (x) => {
			const z = standardise(x);

			return Math.exp(-0.5 * z * z) / (standardDeviation * SQRT_TWO_PI);
		},
		cdf: (x) => 0.5 * erfc(-standardise(x) * SQRT1_2),
		survival: (x) => 0.5 * erfc(standardise(x) * SQRT1_2),
		quantile,
		sample: (random) => inverseTransformSample_(quantile, random),
		mean,
		variance: standardDeviation * standardDeviation,
	};
}
