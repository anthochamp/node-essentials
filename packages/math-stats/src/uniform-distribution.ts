import { clamp } from "@ac-kit/core";

import { assertProbability_ } from "./_assert-probability.js";
import { inverseTransformSample_ } from "./_inverse-transform-sample.js";
import type { Distribution } from "./distribution.js";

/**
 * The continuous uniform distribution over `[lower, upper]`.
 *
 * @param lower Lower bound of the support.
 * @param upper Upper bound of the support; must exceed `lower`.
 * @returns The distribution.
 * @throws {RangeError} When the bounds do not enclose a positive width.
 */
export function uniformDistribution(lower = 0, upper = 1): Distribution {
	const width = upper - lower;
	if (!(width > 0)) {
		throw new RangeError(
			`uniformDistribution: upper must exceed lower, got [${lower}, ${upper}]`,
		);
	}

	const quantile = (probability: number) => {
		assertProbability_("uniformDistribution", probability);

		return lower + probability * width;
	};

	return {
		density: (x) => (x < lower || x > upper ? 0 : 1 / width),
		cdf: (x) => clamp((x - lower) / width, 0, 1),
		// From the upper bound inward, so a value just short of `upper` keeps its
		// significant digits instead of cancelling against 1.
		survival: (x) => clamp((upper - x) / width, 0, 1),
		quantile,
		sample: (random) => inverseTransformSample_(quantile, random),
		mean: lower + width / 2,
		variance: (width * width) / 12,
	};
}
