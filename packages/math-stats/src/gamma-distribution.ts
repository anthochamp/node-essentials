import {
	inverseRegularizedIncompleteGamma,
	logGamma,
	regularizedIncompleteGamma,
	regularizedIncompleteGammaUpper,
} from "@ac-kit/math-analysis";

import { assertProbability_ } from "./_assert-probability.js";
import { inverseTransformSample_ } from "./_inverse-transform-sample.js";
import type { Distribution } from "./distribution.js";

/**
 * The gamma distribution, parameterised by shape and **rate**.
 *
 * Rate rather than scale, so that `gammaDistribution(1, r)` is the same
 * distribution as `exponentialDistribution(r)` and the two agree on what their
 * second argument means. Scale is its reciprocal.
 *
 * @param shape Shape parameter `k`; must be positive.
 * @param rate Rate parameter `λ`; must be positive.
 * @returns The distribution.
 * @throws {RangeError} When either parameter is not positive.
 */
export function gammaDistribution(shape: number, rate = 1): Distribution {
	if (!(shape > 0)) {
		throw new RangeError(
			`gammaDistribution: shape must be positive, got ${shape}`,
		);
	}
	if (!(rate > 0)) {
		throw new RangeError(
			`gammaDistribution: rate must be positive, got ${rate}`,
		);
	}

	const quantile = (probability: number) => {
		assertProbability_("gammaDistribution", probability);

		return inverseRegularizedIncompleteGamma(shape, probability) / rate;
	};

	return {
		density: (x) => {
			if (x < 0) {
				return 0;
			}
			if (x === 0) {
				return shape < 1 ? Number.POSITIVE_INFINITY : shape === 1 ? rate : 0;
			}

			return (
				Math.exp(shape * Math.log(rate * x) - rate * x - logGamma(shape)) / x
			);
		},
		cdf: (x) => (x <= 0 ? 0 : regularizedIncompleteGamma(shape, rate * x)),
		survival: (x) =>
			x <= 0 ? 1 : regularizedIncompleteGammaUpper(shape, rate * x),
		quantile,
		sample: (random) => inverseTransformSample_(quantile, random),
		mean: shape / rate,
		variance: shape / (rate * rate),
	};
}
