import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { binomialDistribution } from "./binomial-distribution.js";
import type { Distribution } from "./distribution.js";
import { geometricDistribution } from "./geometric-distribution.js";
import { hypergeometricDistribution } from "./hypergeometric-distribution.js";
import { negativeBinomialDistribution } from "./negative-binomial-distribution.js";
import { poissonDistribution } from "./poisson-distribution.js";

/**
 * The discrete families, with the inclusive range their support spans.
 *
 * Kept apart from the continuous contract because `cdf` is a step function
 * here: `cdf(quantile(p))` reaches _at least_ `p` rather than equalling it, and
 * asserting equality would be asserting something false.
 */
const FAMILIES: readonly (readonly [
	name: string,
	built: Distribution,
	lowest: number,
	highest: number,
])[] = [
	["binomial", binomialDistribution(20, 0.3), 0, 20],
	["binomial, certain success", binomialDistribution(5, 1), 0, 5],
	["poisson", poissonDistribution(4), 0, 60],
	["poisson, small rate", poissonDistribution(0.1), 0, 20],
	["geometric", geometricDistribution(0.25), 0, 200],
	["negativeBinomial", negativeBinomialDistribution(5, 0.4), 0, 200],
	["hypergeometric", hypergeometricDistribution(50, 15, 10), 0, 10],
];

const PROBABILITIES = [0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99] as const;

// From SciPy's own frozen distributions. `geom` is shifted by `loc=-1` there,
// since SciPy counts trials where this package counts failures.
const REFERENCE: readonly (readonly [
	built: Distribution,
	outcome: number,
	density: number,
	cdf: number,
	survival: number,
])[] = [
	[
		binomialDistribution(20, 0.3),
		6,
		0.19163898275344254,
		0.6080098122009244,
		0.3919901877990756,
	],
	[
		poissonDistribution(4),
		3,
		0.19536681481316454,
		0.43347012036670896,
		0.566529879633291,
	],
	[geometricDistribution(0.25), 3, 0.10546875, 0.68359375, 0.31640625000000006],
	[
		negativeBinomialDistribution(5, 0.4),
		3,
		0.0774144,
		0.17367040000000003,
		0.8263296,
	],
	[
		hypergeometricDistribution(50, 15, 10),
		3,
		0.29785569952103425,
		0.6594066947857975,
		0.34059330521420256,
	],
];

suite("discrete Distribution contract", () => {
	test("matches published values at an interior outcome", () => {
		for (const [built, outcome, density, cdf, survival] of REFERENCE) {
			expectCloseRelative(built.density(outcome), density, 1e-13);
			expectCloseRelative(built.cdf(outcome), cdf, 1e-13);
			expectCloseRelative(built.survival(outcome), survival, 1e-13);
		}
	});
	for (const [name, distribution, lowest, highest] of FAMILIES) {
		suite(name, () => {
			test("carries its whole mass over the support", () => {
				let total = 0;
				for (let outcome = lowest; outcome <= highest; outcome++) {
					total += distribution.density(outcome);
				}
				expectCloseRelative(total, 1, 1e-12);
			});

			test("gives no mass to non-integers or points outside the support", () => {
				expect(distribution.density(1.5)).toBe(0);
				expect(distribution.density(-1)).toBe(0);
				expect(distribution.density(highest + 1_000_000)).toBe(0);
			});

			test("accumulates its own mass into its cumulative function", () => {
				let running = 0;
				for (let outcome = lowest; outcome <= highest; outcome++) {
					running += distribution.density(outcome);
					expectCloseRelative(distribution.cdf(outcome), running, 1e-10);
				}
			});

			test("splits its mass between the two tails", () => {
				for (let outcome = lowest; outcome <= highest; outcome++) {
					expectCloseRelative(
						distribution.cdf(outcome) + distribution.survival(outcome),
						1,
						1e-12,
					);
				}
			});

			test("steps at integers only", () => {
				for (let outcome = lowest; outcome < highest; outcome++) {
					expect(distribution.cdf(outcome + 0.7)).toBe(
						distribution.cdf(outcome),
					);
				}
			});

			test("returns the smallest outcome reaching each probability", () => {
				for (const probability of PROBABILITIES) {
					const outcome = distribution.quantile(probability);

					expect(Number.isInteger(outcome)).toBe(true);
					expect(distribution.cdf(outcome)).toBeGreaterThanOrEqual(
						probability - 1e-12,
					);
					if (outcome > lowest) {
						expect(distribution.cdf(outcome - 1)).toBeLessThan(probability);
					}
				}
			});

			test("never decreases its quantile as the probability grows", () => {
				let previous = Number.NEGATIVE_INFINITY;
				for (const probability of PROBABILITIES) {
					const current = distribution.quantile(probability);
					expect(current).toBeGreaterThanOrEqual(previous);
					previous = current;
				}
			});

			test("rejects a probability outside the unit interval", () => {
				expect(() => distribution.quantile(-0.1)).toThrow(RangeError);
				expect(() => distribution.quantile(1.1)).toThrow(RangeError);
			});
		});
	}

	test("rejects parameters outside each family's domain", () => {
		expect(() => binomialDistribution(-1, 0.5)).toThrow(RangeError);
		expect(() => binomialDistribution(1.5, 0.5)).toThrow(RangeError);
		expect(() => binomialDistribution(10, 1.5)).toThrow(RangeError);
		expect(() => poissonDistribution(0)).toThrow(RangeError);
		expect(() => geometricDistribution(0)).toThrow(RangeError);
		expect(() => geometricDistribution(1.5)).toThrow(RangeError);
		expect(() => negativeBinomialDistribution(0, 0.5)).toThrow(RangeError);
		expect(() => negativeBinomialDistribution(5, 0)).toThrow(RangeError);
		expect(() => hypergeometricDistribution(10, 20, 5)).toThrow(RangeError);
		expect(() => hypergeometricDistribution(10, 5, 20)).toThrow(RangeError);
		expect(() => hypergeometricDistribution(10, 5, 1.5)).toThrow(RangeError);
	});
});
