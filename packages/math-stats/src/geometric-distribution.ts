import { assertProbability_ } from "./_assert-probability.js";
import { inverseTransformSample_ } from "./_inverse-transform-sample.js";
import type { Distribution } from "./distribution.js";

/**
 * The geometric distribution — the number of **failures** before the first
 * success.
 *
 * The support therefore starts at 0, not 1. That is the convention under which
 * `geometricDistribution(p)` and `negativeBinomialDistribution(1, p)` are the
 * same distribution; libraries counting trials instead give an answer one
 * larger throughout.
 *
 * Every member has a closed form, `quantile` included, so none of them
 * iterates.
 *
 * @param probability Success probability of one attempt, in `(0, 1]`.
 * @returns The distribution.
 * @throws {RangeError} When `probability` is outside `(0, 1]`.
 */
export function geometricDistribution(probability: number): Distribution {
	if (!(probability > 0 && probability <= 1)) {
		throw new RangeError(
			`geometricDistribution: probability must be in (0, 1], got ${probability}`,
		);
	}

	/** `ln(1 − p)`, the log of one failure, taken accurately for small `p`. */
	const logFailure = Math.log1p(-probability);

	const quantile = (target: number) => {
		assertProbability_("geometricDistribution", target);

		if (probability === 1) {
			return 0;
		}
		if (target >= 1) {
			return Number.POSITIVE_INFINITY;
		}

		// Smallest k with 1 − (1 − p)^(k+1) ≥ target, solved rather than searched.
		return Math.max(0, Math.ceil(Math.log1p(-target) / logFailure) - 1);
	};

	return {
		density: (x) =>
			Number.isInteger(x) && x >= 0
				? Math.exp(x * logFailure) * probability
				: 0,
		cdf: (x) => {
			const failures = Math.floor(x);

			return failures < 0 ? 0 : -Math.expm1((failures + 1) * logFailure);
		},
		survival: (x) => {
			const failures = Math.floor(x);

			return failures < 0 ? 1 : Math.exp((failures + 1) * logFailure);
		},
		quantile,
		sample: (random) => inverseTransformSample_(quantile, random),
		mean: (1 - probability) / probability,
		variance: (1 - probability) / (probability * probability),
	};
}
