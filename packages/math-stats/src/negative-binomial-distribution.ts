import { logGamma, regularizedIncompleteBeta } from "@ac-kit/math-analysis";

import { assertProbability_ } from "./_assert-probability.js";
import { discreteQuantile_ } from "./_discrete-quantile.js";
import { inverseTransformSample_ } from "./_inverse-transform-sample.js";
import type { Distribution } from "./distribution.js";

/**
 * The negative binomial distribution — the number of **failures** before the
 * `successes`-th success.
 *
 * Counting failures rather than trials, so that
 * `negativeBinomialDistribution(1, p)` is exactly `geometricDistribution(p)`.
 * `successes` need not be an integer; the Pólya form with a real stopping
 * parameter is the same formula.
 *
 * @param successes Number of successes to wait for; must be positive.
 * @param probability Success probability of one attempt, in `(0, 1]`.
 * @returns The distribution.
 * @throws {RangeError} When `successes` is not positive, or `probability` is
 *   outside `(0, 1]`.
 */
export function negativeBinomialDistribution(
	successes: number,
	probability: number,
): Distribution {
	if (!(successes > 0)) {
		throw new RangeError(
			`negativeBinomialDistribution: successes must be positive, got ${successes}`,
		);
	}
	if (!(probability > 0 && probability <= 1)) {
		throw new RangeError(
			`negativeBinomialDistribution: probability must be in (0, 1], got ${probability}`,
		);
	}

	const cdf = (x: number) => {
		const failures = Math.floor(x);

		return failures < 0
			? 0
			: regularizedIncompleteBeta(successes, failures + 1, probability);
	};

	const quantile = (target: number) => {
		assertProbability_("negativeBinomialDistribution", target);

		return discreteQuantile_(cdf, target, 0, Number.POSITIVE_INFINITY);
	};

	return {
		density: (x) => {
			if (!Number.isInteger(x) || x < 0) {
				return 0;
			}
			if (probability === 1) {
				return x === 0 ? 1 : 0;
			}

			return Math.exp(
				logGamma(x + successes) -
					logGamma(x + 1) -
					logGamma(successes) +
					successes * Math.log(probability) +
					x * Math.log1p(-probability),
			);
		},
		cdf,
		survival: (x) => {
			const failures = Math.floor(x);

			return failures < 0
				? 1
				: regularizedIncompleteBeta(failures + 1, successes, 1 - probability);
		},
		quantile,
		sample: (random) => inverseTransformSample_(quantile, random),
		mean: (successes * (1 - probability)) / probability,
		variance: (successes * (1 - probability)) / (probability * probability),
	};
}
