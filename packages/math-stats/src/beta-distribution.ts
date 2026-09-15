import {
	inverseRegularizedIncompleteBeta,
	logBeta,
	regularizedIncompleteBeta,
} from "@ac-kit/math-analysis";

import { assertProbability_ } from "./_assert-probability.js";
import { inverseTransformSample_ } from "./_inverse-transform-sample.js";
import type { Distribution } from "./distribution.js";

/**
 * The beta distribution over `[0, 1]` — the conjugate prior of a proportion,
 * and the reference distribution behind the t and F families.
 *
 * `survival` uses the exact reflection `1 − Iₓ(a, b) = I₁₋ₓ(b, a)` rather than
 * the subtraction it is written as, so the upper tail keeps its digits.
 *
 * @param alpha First shape parameter; must be positive.
 * @param beta Second shape parameter; must be positive.
 * @returns The distribution.
 * @throws {RangeError} When either shape is not positive.
 */
export function betaDistribution(alpha: number, beta: number): Distribution {
	if (!(alpha > 0)) {
		throw new RangeError(
			`betaDistribution: alpha must be positive, got ${alpha}`,
		);
	}
	if (!(beta > 0)) {
		throw new RangeError(
			`betaDistribution: beta must be positive, got ${beta}`,
		);
	}

	const logNormaliser = logBeta(alpha, beta);
	const total = alpha + beta;
	/** Where the distribution's mass tips from one side to the other. */
	const crossover = (alpha + 1) / (total + 2);

	const quantile = (probability: number) => {
		assertProbability_("betaDistribution", probability);

		return inverseRegularizedIncompleteBeta(alpha, beta, probability);
	};

	return {
		density: (x) => {
			if (x < 0 || x > 1) {
				return 0;
			}

			return Math.exp(
				(alpha - 1) * Math.log(x) + (beta - 1) * Math.log1p(-x) - logNormaliser,
			);
		},
		cdf: (x) =>
			x <= 0 ? 0 : x >= 1 ? 1 : regularizedIncompleteBeta(alpha, beta, x),
		survival: (x) => {
			if (x <= 0) {
				return 1;
			}
			if (x >= 1) {
				return 0;
			}

			// Below the crossover the upper tail is the large one, and the exact
			// reflection `I₁₋ₓ(b, a)` cannot express it: `1 - x` rounds to 1 for any
			// `x` under an ulp, which reports the whole tail as 1. Subtracting the
			// small lower tail from 1 is exact there. Above the crossover the roles
			// swap and the reflection is the only form that keeps the digits.
			return x < crossover
				? 1 - regularizedIncompleteBeta(alpha, beta, x)
				: regularizedIncompleteBeta(beta, alpha, 1 - x);
		},
		quantile,
		sample: (random) => inverseTransformSample_(quantile, random),
		mean: alpha / total,
		variance: (alpha * beta) / (total * total * (total + 1)),
	};
}
