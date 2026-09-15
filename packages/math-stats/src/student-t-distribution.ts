import {
	inverseRegularizedIncompleteBeta,
	logGamma,
	regularizedIncompleteBeta,
} from "@ac-kit/math-analysis";

import { assertProbability_ } from "./_assert-probability.js";
import { inverseTransformSample_ } from "./_inverse-transform-sample.js";
import type { Distribution } from "./distribution.js";

/**
 * Student's t distribution — the reference distribution of a mean estimated
 * from a sample whose variance was estimated from the same sample.
 *
 * The tails go through the incomplete beta on the half of the domain where each
 * is small: `survival(t)` for positive `t` and `cdf(t)` for negative `t` are
 * each computed directly, and the other is their exact complement. Taking both
 * from one branch would reduce a p-value of `1e-16` to zero.
 *
 * @param degreesOfFreedom Positive; need not be an integer.
 * @returns The distribution.
 * @throws {RangeError} When `degreesOfFreedom` is not positive.
 */
export function studentTDistribution(degreesOfFreedom: number): Distribution {
	if (!(degreesOfFreedom > 0)) {
		throw new RangeError(
			`studentTDistribution: degreesOfFreedom must be positive, got ${degreesOfFreedom}`,
		);
	}

	const half = degreesOfFreedom / 2;
	const logNormaliser =
		logGamma(half + 0.5) -
		logGamma(half) -
		0.5 * Math.log(degreesOfFreedom * Math.PI);

	/** `½·I_{ν/(ν+t²)}(ν/2, ½)` — the mass beyond `|t|`, in either direction. */
	const outerTail = (t: number) =>
		0.5 *
		regularizedIncompleteBeta(
			half,
			0.5,
			degreesOfFreedom / (degreesOfFreedom + t * t),
		);

	const quantile = (probability: number) => {
		assertProbability_("studentTDistribution", probability);

		if (probability === 0.5) {
			return 0;
		}

		// Solved from the tail on whichever side `probability` names, so the beta
		// inverse is handed a small argument rather than one adjacent to 1.
		const tail = Math.min(probability, 1 - probability);
		const inverted = inverseRegularizedIncompleteBeta(half, 0.5, 2 * tail);
		const magnitude = Math.sqrt((degreesOfFreedom * (1 - inverted)) / inverted);

		return probability < 0.5 ? -magnitude : magnitude;
	};

	return {
		density: (t) =>
			Math.exp(
				logNormaliser - (half + 0.5) * Math.log1p((t * t) / degreesOfFreedom),
			),
		cdf: (t) => (t <= 0 ? outerTail(t) : 1 - outerTail(t)),
		survival: (t) => (t >= 0 ? outerTail(t) : 1 - outerTail(t)),
		quantile,
		sample: (random) => inverseTransformSample_(quantile, random),
		mean: degreesOfFreedom > 1 ? 0 : Number.NaN,
		variance:
			degreesOfFreedom > 2
				? degreesOfFreedom / (degreesOfFreedom - 2)
				: degreesOfFreedom > 1
					? Number.POSITIVE_INFINITY
					: Number.NaN,
	};
}
