import { PreciseSum } from "@ac-kit/core";

import { assertProbability_ } from "./_assert-probability.js";
import { discreteQuantile_ } from "./_discrete-quantile.js";
import { inverseTransformSample_ } from "./_inverse-transform-sample.js";
import { logBinomial_ } from "./_log-binomial.js";
import type { Distribution } from "./distribution.js";

/**
 * The hypergeometric distribution — successes drawn without replacement.
 *
 * The only family here with no closed form for its tails: unlike the binomial,
 * whose sampling-with-replacement counterpart collapses into an incomplete
 * beta, this one has to be summed. Each tail is summed from its **own** end
 * inward, so every term is positive and nothing is reached by subtracting a
 * near-one value from one.
 *
 * @param population Total size `N`; a non-negative integer.
 * @param successes Successes in the population `K`; in `[0, N]`.
 * @param draws Number drawn `n`; in `[0, N]`.
 * @returns The distribution.
 * @throws {RangeError} When any argument is not an integer in range.
 */
export function hypergeometricDistribution(
	population: number,
	successes: number,
	draws: number,
): Distribution {
	for (const [name, value] of [
		["population", population],
		["successes", successes],
		["draws", draws],
	] as const) {
		if (!Number.isInteger(value) || value < 0) {
			throw new RangeError(
				`hypergeometricDistribution: ${name} must be a non-negative integer, got ${value}`,
			);
		}
	}
	if (successes > population || draws > population) {
		throw new RangeError(
			`hypergeometricDistribution: successes and draws must not exceed population ${population}`,
		);
	}

	const lowest = Math.max(0, draws + successes - population);
	const highest = Math.min(draws, successes);
	const logTotal = logBinomial_(population, draws);

	const density = (x: number) => {
		if (!Number.isInteger(x) || x < lowest || x > highest) {
			return 0;
		}

		return Math.exp(
			logBinomial_(successes, x) +
				logBinomial_(population - successes, draws - x) -
				logTotal,
		);
	};

	/** Sums the mass over an inclusive run of outcomes. */
	const massBetween = (from: number, to: number) => {
		const total = new PreciseSum();
		for (let outcome = from; outcome <= to; outcome++) {
			total.add(density(outcome));
		}

		return total.value;
	};

	const cdf = (x: number) => {
		const drawn = Math.floor(x);
		if (drawn < lowest) {
			return 0;
		}
		if (drawn >= highest) {
			return 1;
		}

		return massBetween(lowest, drawn);
	};

	const quantile = (probability: number) => {
		assertProbability_("hypergeometricDistribution", probability);

		return discreteQuantile_(cdf, probability, lowest, highest);
	};

	const successRate = successes / population;

	return {
		density,
		cdf,
		survival: (x) => {
			const drawn = Math.floor(x);
			if (drawn < lowest) {
				return 1;
			}
			if (drawn >= highest) {
				return 0;
			}

			return massBetween(drawn + 1, highest);
		},
		quantile,
		sample: (random) => inverseTransformSample_(quantile, random),
		mean: draws * successRate,
		variance:
			population > 1
				? draws *
					successRate *
					(1 - successRate) *
					((population - draws) / (population - 1))
				: 0,
	};
}
