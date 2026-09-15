import { regularizedIncompleteBeta } from "@ac-kit/math-analysis";

import { assertProbability_ } from "./_assert-probability.js";
import { discreteQuantile_ } from "./_discrete-quantile.js";
import { inverseTransformSample_ } from "./_inverse-transform-sample.js";
import { logBinomial_ } from "./_log-binomial.js";
import type { Distribution } from "./distribution.js";

/**
 * The binomial distribution — the number of successes in `trials` independent
 * attempts, each succeeding with probability `probability`.
 *
 * Both tails come from the regularized incomplete beta, which is an exact
 * identity rather than an approximation: `P(X ≤ k) = I₁₋ₚ(n − k, k + 1)`. That
 * costs one continued fraction instead of a sum of `k` terms, and keeps the
 * upper tail accurate where summing from the bottom and subtracting would not.
 *
 * @param trials Number of attempts; a non-negative integer.
 * @param probability Success probability of one attempt, in `[0, 1]`.
 * @returns The distribution.
 * @throws {RangeError} When `trials` is not a non-negative integer, or
 *   `probability` is outside `[0, 1]`.
 */
export function binomialDistribution(
	trials: number,
	probability: number,
): Distribution {
	if (!Number.isInteger(trials) || trials < 0) {
		throw new RangeError(
			`binomialDistribution: trials must be a non-negative integer, got ${trials}`,
		);
	}
	assertProbability_("binomialDistribution", probability);

	const cdf = (x: number) => {
		const successes = Math.floor(x);
		if (successes < 0) {
			return 0;
		}
		if (successes >= trials) {
			return 1;
		}

		return regularizedIncompleteBeta(
			trials - successes,
			successes + 1,
			1 - probability,
		);
	};

	const quantile = (target: number) => {
		assertProbability_("binomialDistribution", target);

		return discreteQuantile_(cdf, target, 0, trials);
	};

	return {
		density: (x) => {
			if (!Number.isInteger(x) || x < 0 || x > trials) {
				return 0;
			}
			// `0 ** 0` is 1, but `0 * Math.log(0)` is NaN, so the degenerate
			// probabilities are answered before any logarithm is taken.
			if (probability === 0) {
				return x === 0 ? 1 : 0;
			}
			if (probability === 1) {
				return x === trials ? 1 : 0;
			}

			return Math.exp(
				logBinomial_(trials, x) +
					x * Math.log(probability) +
					(trials - x) * Math.log1p(-probability),
			);
		},
		cdf,
		survival: (x) => {
			const successes = Math.floor(x);
			if (successes < 0) {
				return 1;
			}
			if (successes >= trials) {
				return 0;
			}

			return regularizedIncompleteBeta(
				successes + 1,
				trials - successes,
				probability,
			);
		},
		quantile,
		sample: (random) => inverseTransformSample_(quantile, random),
		mean: trials * probability,
		variance: trials * probability * (1 - probability),
	};
}
