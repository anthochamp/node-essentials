import {
	inverseRegularizedIncompleteBeta,
	logBeta,
	regularizedIncompleteBeta,
} from "@ac-kit/math-analysis";

import { assertProbability_ } from "./_assert-probability.js";
import { inverseTransformSample_ } from "./_inverse-transform-sample.js";
import type { Distribution } from "./distribution.js";

/**
 * The F distribution — the ratio of two chi-squared variates divided by their
 * degrees of freedom, and the reference distribution of an analysis of
 * variance.
 *
 * Each tail is reached through the incomplete beta on the side where it is
 * small, and the quantile is solved from whichever tail `probability` names, so
 * neither ever hands the beta inverse an argument adjacent to 1.
 *
 * @param numeratorDegreesOfFreedom Positive; need not be an integer.
 * @param denominatorDegreesOfFreedom Positive; need not be an integer.
 * @returns The distribution.
 * @throws {RangeError} When either parameter is not positive.
 */
export function fDistribution(
	numeratorDegreesOfFreedom: number,
	denominatorDegreesOfFreedom: number,
): Distribution {
	if (!(numeratorDegreesOfFreedom > 0)) {
		throw new RangeError(
			`fDistribution: numeratorDegreesOfFreedom must be positive, got ${numeratorDegreesOfFreedom}`,
		);
	}
	if (!(denominatorDegreesOfFreedom > 0)) {
		throw new RangeError(
			`fDistribution: denominatorDegreesOfFreedom must be positive, got ${denominatorDegreesOfFreedom}`,
		);
	}

	const halfNumerator = numeratorDegreesOfFreedom / 2;
	const halfDenominator = denominatorDegreesOfFreedom / 2;
	const logNormaliser = logBeta(halfNumerator, halfDenominator);

	const quantile = (probability: number) => {
		assertProbability_("fDistribution", probability);

		if (probability === 1) {
			return Number.POSITIVE_INFINITY;
		}

		// Solved from the near end: for the upper half the beta inverse is given
		// `1 − probability` against the swapped shapes, so its argument stays small
		// and the ratio below divides by a well-resolved number.
		if (probability > 0.5) {
			const upper = inverseRegularizedIncompleteBeta(
				halfDenominator,
				halfNumerator,
				1 - probability,
			);

			return (
				(denominatorDegreesOfFreedom * (1 - upper)) /
				(numeratorDegreesOfFreedom * upper)
			);
		}

		const lower = inverseRegularizedIncompleteBeta(
			halfNumerator,
			halfDenominator,
			probability,
		);

		return (
			(denominatorDegreesOfFreedom * lower) /
			(numeratorDegreesOfFreedom * (1 - lower))
		);
	};

	return {
		density: (x) => {
			if (x <= 0) {
				return 0;
			}
			const scaled = numeratorDegreesOfFreedom * x;
			const total = scaled + denominatorDegreesOfFreedom;

			return Math.exp(
				halfNumerator * Math.log(scaled) +
					halfDenominator * Math.log(denominatorDegreesOfFreedom) -
					(halfNumerator + halfDenominator) * Math.log(total) -
					Math.log(x) -
					logNormaliser,
			);
		},
		cdf: (x) => {
			if (x <= 0) {
				return 0;
			}
			const scaled = numeratorDegreesOfFreedom * x;

			return regularizedIncompleteBeta(
				halfNumerator,
				halfDenominator,
				scaled / (scaled + denominatorDegreesOfFreedom),
			);
		},
		survival: (x) => {
			if (x <= 0) {
				return 1;
			}
			const scaled = numeratorDegreesOfFreedom * x;

			return regularizedIncompleteBeta(
				halfDenominator,
				halfNumerator,
				denominatorDegreesOfFreedom / (scaled + denominatorDegreesOfFreedom),
			);
		},
		quantile,
		sample: (random) => inverseTransformSample_(quantile, random),
		mean:
			denominatorDegreesOfFreedom > 2
				? denominatorDegreesOfFreedom / (denominatorDegreesOfFreedom - 2)
				: Number.NaN,
		variance:
			denominatorDegreesOfFreedom > 4
				? (2 *
						denominatorDegreesOfFreedom *
						denominatorDegreesOfFreedom *
						(numeratorDegreesOfFreedom + denominatorDegreesOfFreedom - 2)) /
					(numeratorDegreesOfFreedom *
						(denominatorDegreesOfFreedom - 2) ** 2 *
						(denominatorDegreesOfFreedom - 4))
				: Number.NaN,
	};
}
