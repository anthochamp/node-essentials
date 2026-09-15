import { assertProbability_ } from "./_assert-probability.js";
import { inverseTransformSample_ } from "./_inverse-transform-sample.js";
import type { Distribution } from "./distribution.js";

/**
 * The exponential distribution — the waiting time between events arriving at a
 * constant average `rate`.
 *
 * Every member has a closed form, and each is written in the shape that keeps
 * it accurate: `expm1` and `log1p` rather than `exp` and `log` of a quantity
 * near 1, which is where the whole answer sits for a short wait.
 *
 * @param rate Events per unit time; must be positive.
 * @returns The distribution.
 * @throws {RangeError} When `rate` is not positive.
 */
export function exponentialDistribution(rate = 1): Distribution {
	if (!(rate > 0)) {
		throw new RangeError(
			`exponentialDistribution: rate must be positive, got ${rate}`,
		);
	}

	const quantile = (probability: number) => {
		assertProbability_("exponentialDistribution", probability);

		return -Math.log1p(-probability) / rate;
	};

	return {
		density: (x) => (x < 0 ? 0 : rate * Math.exp(-rate * x)),
		cdf: (x) => (x < 0 ? 0 : -Math.expm1(-rate * x)),
		survival: (x) => (x < 0 ? 1 : Math.exp(-rate * x)),
		quantile,
		sample: (random) => inverseTransformSample_(quantile, random),
		mean: 1 / rate,
		variance: 1 / (rate * rate),
	};
}
