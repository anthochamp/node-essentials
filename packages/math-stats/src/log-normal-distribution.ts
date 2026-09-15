import { SQRT_TWO_PI } from "@ac-kit/math-scalar";

import { assertProbability_ } from "./_assert-probability.js";
import { inverseTransformSample_ } from "./_inverse-transform-sample.js";
import type { Distribution } from "./distribution.js";
import { normalDistribution } from "./normal-distribution.js";

/**
 * The log-normal distribution: a variable whose logarithm is normal.
 *
 * The parameters name the log scale rather than the variable's own, because
 * that is what they describe — `logMean` is not the distribution's mean, which
 * is `exp(logMean + logStandardDeviation² / 2)` and is exposed separately.
 *
 * @param logMean Mean of the underlying normal.
 * @param logStandardDeviation Standard deviation of it; must be positive.
 * @returns The distribution.
 * @throws {RangeError} When `logStandardDeviation` is not positive.
 */
export function logNormalDistribution(
	logMean = 0,
	logStandardDeviation = 1,
): Distribution {
	if (!(logStandardDeviation > 0)) {
		throw new RangeError(
			`logNormalDistribution: logStandardDeviation must be positive, got ${logStandardDeviation}`,
		);
	}

	const underlying = normalDistribution(logMean, logStandardDeviation);

	const quantile = (probability: number) => {
		assertProbability_("logNormalDistribution", probability);

		return Math.exp(underlying.quantile(probability));
	};

	const variance =
		Math.expm1(logStandardDeviation * logStandardDeviation) *
		Math.exp(2 * logMean + logStandardDeviation * logStandardDeviation);

	return {
		density: (x) => {
			if (x <= 0) {
				return 0;
			}
			const z = (Math.log(x) - logMean) / logStandardDeviation;

			return Math.exp(-0.5 * z * z) / (x * logStandardDeviation * SQRT_TWO_PI);
		},
		cdf: (x) => (x <= 0 ? 0 : underlying.cdf(Math.log(x))),
		survival: (x) => (x <= 0 ? 1 : underlying.survival(Math.log(x))),
		quantile,
		sample: (random) => inverseTransformSample_(quantile, random),
		mean: Math.exp(logMean + (logStandardDeviation * logStandardDeviation) / 2),
		variance,
	};
}
