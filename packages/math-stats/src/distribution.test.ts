import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { betaDistribution } from "./beta-distribution.js";
import { chiSquaredDistribution } from "./chi-squared-distribution.js";
import type { Distribution } from "./distribution.js";
import { exponentialDistribution } from "./exponential-distribution.js";
import { fDistribution } from "./f-distribution.js";
import { gammaDistribution } from "./gamma-distribution.js";
import { logNormalDistribution } from "./log-normal-distribution.js";
import { normalDistribution } from "./normal-distribution.js";
import { studentTDistribution } from "./student-t-distribution.js";
import { uniformDistribution } from "./uniform-distribution.js";

/**
 * Every family, so the shared contract is asserted once rather than restated in
 * each family's own file. Those cover the values particular to the family; this
 * covers what makes all of them a {@link Distribution}.
 */
const FAMILIES: readonly (readonly [name: string, built: Distribution])[] = [
	["normal", normalDistribution(0, 1)],
	["normal, shifted", normalDistribution(-3, 0.25)],
	["logNormal", logNormalDistribution(0, 1)],
	["exponential", exponentialDistribution(2.5)],
	["uniform", uniformDistribution(-1, 3)],
	["gamma", gammaDistribution(2.5, 1.5)],
	["gamma, sub-unit shape", gammaDistribution(0.4)],
	["chiSquared", chiSquaredDistribution(4)],
	["studentT", studentTDistribution(7)],
	["studentT, heavy tail", studentTDistribution(1.5)],
	["beta", betaDistribution(2, 5)],
	["beta, sub-unit shapes", betaDistribution(0.4, 0.7)],
	["f", fDistribution(3, 10)],
	["f, few denominator degrees", fDistribution(5, 2)],
];

/** Spread across the whole unit interval, including both tails. */
const PROBABILITIES = [
	1e-10,
	1e-4,
	0.01,
	0.25,
	0.5,
	0.75,
	0.99,
	1 - 1e-4,
	1 - 1e-10,
] as const;

// From SciPy's own frozen distributions, one interior point per family.
const REFERENCE: readonly (readonly [
	built: Distribution,
	x: number,
	density: number,
	cdf: number,
	survival: number,
])[] = [
	[
		normalDistribution(0, 1),
		1.5,
		0.12951759566589174,
		0.9331927987311419,
		0.06680720126885807,
	],
	[
		logNormalDistribution(0, 1),
		2,
		0.15687401927898112,
		0.7558914042144173,
		0.24410859578558275,
	],
	[
		exponentialDistribution(2.5),
		0.4,
		0.9196986029286058,
		0.6321205588285577,
		0.36787944117144233,
	],
	[
		gammaDistribution(2.5, 1.5),
		1.7,
		0.3587685795333825,
		0.5962015428957922,
		0.4037984571042078,
	],
	[
		chiSquaredDistribution(4),
		3.2,
		0.1615172143957243,
		0.47506905321389586,
		0.5249309467861041,
	],
	[
		studentTDistribution(7),
		1.9,
		0.07294267904407147,
		0.9503969902663183,
		0.04960300973368173,
	],
	[
		betaDistribution(2, 5),
		0.3,
		2.1608999999999994,
		0.5798250000000003,
		0.420175,
	],
	[
		fDistribution(3, 10),
		2.4,
		0.10146490934317794,
		0.8712675140016796,
		0.1287324859983204,
	],
];

suite("Distribution contract", () => {
	test("matches published values at an interior point", () => {
		for (const [built, x, density, cdf, survival] of REFERENCE) {
			expectCloseRelative(built.density(x), density, 1e-13);
			expectCloseRelative(built.cdf(x), cdf, 1e-13);
			expectCloseRelative(built.survival(x), survival, 1e-13);
		}
	});

	for (const [name, distribution] of FAMILIES) {
		suite(name, () => {
			test("has a cumulative function confined to the unit interval", () => {
				for (const probability of PROBABILITIES) {
					const value = distribution.cdf(distribution.quantile(probability));
					expect(value).toBeGreaterThanOrEqual(0);
					expect(value).toBeLessThanOrEqual(1);
				}
			});

			test("never decreases as its argument grows", () => {
				let previous = -1;
				for (const probability of PROBABILITIES) {
					const current = distribution.cdf(distribution.quantile(probability));
					expect(current).toBeGreaterThanOrEqual(previous);
					previous = current;
				}
			});

			test("splits its mass between the two tails", () => {
				for (const probability of PROBABILITIES) {
					const x = distribution.quantile(probability);
					expectCloseRelative(
						distribution.cdf(x) + distribution.survival(x),
						1,
						1e-12,
					);
				}
			});

			test("inverts its own quantile function", () => {
				// Away from the extreme tails, where the density is steep enough that
				// a correctly-rounded quantile still round-trips visibly off.
				for (const probability of [0.01, 0.25, 0.5, 0.75, 0.99]) {
					expectCloseRelative(
						distribution.cdf(distribution.quantile(probability)),
						probability,
						1e-9,
					);
				}
			});

			test("increases its quantile with its argument", () => {
				let previous = Number.NEGATIVE_INFINITY;
				for (const probability of PROBABILITIES) {
					const current = distribution.quantile(probability);
					expect(current).toBeGreaterThanOrEqual(previous);
					previous = current;
				}
			});

			test("has a non-negative density everywhere it is asked", () => {
				for (const probability of [0.05, 0.3, 0.6, 0.95]) {
					expect(
						distribution.density(distribution.quantile(probability)),
					).toBeGreaterThanOrEqual(0);
				}
			});

			test("draws reproducibly from a given source", () => {
				const source = () => 0.375;
				expect(distribution.sample(source)).toBe(distribution.quantile(0.375));
			});

			test("rejects a probability outside the unit interval", () => {
				expect(() => distribution.quantile(-0.1)).toThrow(RangeError);
				expect(() => distribution.quantile(1.1)).toThrow(RangeError);
				expect(() => distribution.quantile(Number.NaN)).toThrow(RangeError);
			});

			test("reports moments as numbers", () => {
				expect(typeof distribution.mean).toBe("number");
				expect(typeof distribution.variance).toBe("number");
			});
		});
	}

	test("rejects parameters outside each family's domain", () => {
		expect(() => normalDistribution(0, 0)).toThrow(RangeError);
		expect(() => normalDistribution(0, -1)).toThrow(RangeError);
		expect(() => logNormalDistribution(0, 0)).toThrow(RangeError);
		expect(() => exponentialDistribution(0)).toThrow(RangeError);
		expect(() => uniformDistribution(1, 1)).toThrow(RangeError);
		expect(() => uniformDistribution(2, 1)).toThrow(RangeError);
		expect(() => gammaDistribution(0)).toThrow(RangeError);
		expect(() => gammaDistribution(1, 0)).toThrow(RangeError);
		expect(() => chiSquaredDistribution(0)).toThrow(RangeError);
		expect(() => studentTDistribution(0)).toThrow(RangeError);
		expect(() => betaDistribution(0, 1)).toThrow(RangeError);
		expect(() => betaDistribution(1, -1)).toThrow(RangeError);
		expect(() => fDistribution(0, 1)).toThrow(RangeError);
		expect(() => fDistribution(1, 0)).toThrow(RangeError);
	});
});
