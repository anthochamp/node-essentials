import type { Distribution } from "./distribution.js";
import { gammaDistribution } from "./gamma-distribution.js";

/**
 * The chi-squared distribution — the sum of `degreesOfFreedom` squared standard
 * normals, and the reference distribution of the goodness-of-fit statistic.
 *
 * It is exactly `gammaDistribution(k / 2, 1 / 2)`, so it delegates rather than
 * restating the incomplete gamma a second time; only the moments are named
 * directly, where the closed form is simpler than the delegation.
 *
 * @param degreesOfFreedom Positive; need not be an integer.
 * @returns The distribution.
 * @throws {RangeError} When `degreesOfFreedom` is not positive.
 */
export function chiSquaredDistribution(degreesOfFreedom: number): Distribution {
	if (!(degreesOfFreedom > 0)) {
		throw new RangeError(
			`chiSquaredDistribution: degreesOfFreedom must be positive, got ${degreesOfFreedom}`,
		);
	}

	const underlying = gammaDistribution(degreesOfFreedom / 2, 0.5);

	return {
		...underlying,
		mean: degreesOfFreedom,
		variance: 2 * degreesOfFreedom,
	};
}
