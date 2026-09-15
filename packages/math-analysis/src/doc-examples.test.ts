import { describe, expect, it } from "vitest";

import { beta } from "./beta.js";
import { bisect } from "./bisect.js";
import { continuedFractionEval } from "./continued-fraction-eval.js";
import { ConvergenceError } from "./convergence-error.js";
import { erf } from "./erf.js";
import { erfc } from "./erfc.js";
import { gamma } from "./gamma.js";
import { inverseRegularizedIncompleteBeta } from "./inverse-regularized-incomplete-beta.js";
import { inverseRegularizedIncompleteGamma } from "./inverse-regularized-incomplete-gamma.js";
import { logBeta } from "./log-beta.js";
import { logGamma } from "./log-gamma.js";
import { regularizedIncompleteBeta } from "./regularized-incomplete-beta.js";
import { regularizedIncompleteGammaUpper } from "./regularized-incomplete-gamma-upper.js";
import { regularizedIncompleteGamma } from "./regularized-incomplete-gamma.js";
import { trapezoidalRule } from "./trapezoidal-rule.js";

// Every value published in an `@example` block, pinned. A number printed in the
// documentation is a claim, and this is where it is kept honest: a change that
// moves one of these fails here rather than silently making the reference lie.
describe("documented examples", () => {
	it("gamma", () => {
		expect(gamma(5)).toBe(23.999_999_999_999_986);
		expect(gamma(0.5)).toBe(1.772_453_850_905_515_2);
		expect(gamma(-1)).toBeNaN();
		expect(gamma(172)).toBe(Number.POSITIVE_INFINITY);
	});

	it("logGamma", () => {
		expect(logGamma(172)).toBe(711.714_725_802_29);
		expect(logGamma(1e6)).toBe(12_815_504.569_147_61);
		expect(logGamma(-1)).toBeNaN();
	});

	it("beta", () => {
		expect(beta(2, 3)).toBe(0.083_333_333_333_333_36);
		expect(beta(0.5, 0.5)).toBe(3.141_592_653_589_790_5);
		expect(beta(500, 500)).toBe(1.479_901_599_125_506_8e-302);
		expect(beta(2000, 2000)).toBe(0);
	});

	it("logBeta", () => {
		expect(logBeta(500, 500)).toBe(-694.988_722_485_713_5);
		expect(logBeta(2000, 2000)).toBe(-2775.123_598_846_075_8);
	});

	it("erf", () => {
		expect(erf(1)).toBe(0.842_700_792_949_714_8);
		expect(erf(6)).toBe(1);
	});

	it("erfc", () => {
		expect(erfc(6)).toBe(2.151_973_671_249_891_6e-17);
		expect(1 - erf(6)).toBe(0);
		expect(erfc(20)).toBe(5.395_865_611_607_905e-176);
	});

	it("regularizedIncompleteGamma", () => {
		expect(regularizedIncompleteGamma(0.5, 1)).toBe(0.842_700_792_949_714_8);
		expect(regularizedIncompleteGamma(3, 20)).toBe(0.999_999_544_485_049_5);
		expect(1 - regularizedIncompleteGamma(3, 20)).toBe(
			4.555_149_505_369_726_6e-7,
		);
	});

	it("regularizedIncompleteGammaUpper", () => {
		expect(regularizedIncompleteGammaUpper(3, 20)).toBe(
			4.555_149_505_589_215e-7,
		);
	});

	it("regularizedIncompleteBeta", () => {
		expect(regularizedIncompleteBeta(2, 3, 0.5)).toBe(0.6875);
		expect(regularizedIncompleteBeta(0.5, 0.5, 0.5)).toBe(
			0.499_999_999_999_999_44,
		);
	});

	it("inverseRegularizedIncompleteGamma", () => {
		const median = inverseRegularizedIncompleteGamma(3, 0.5);
		expect(median).toBe(2.674_060_313_723_559);
		expect(regularizedIncompleteGamma(3, median)).toBe(0.499_999_999_999_999_9);
	});

	it("inverseRegularizedIncompleteBeta", () => {
		expect(inverseRegularizedIncompleteBeta(2, 3, 0.5)).toBe(
			0.385_727_568_132_389_34,
		);
	});

	it("bisect", () => {
		expect(bisect((x) => x * x - 2, 0, 2)).toBe(1.414_213_562_372_879);
		expect(() => bisect((x) => x * x - 2, 2, 3)).toThrow(RangeError);
	});

	it("trapezoidalRule", () => {
		expect(trapezoidalRule(Math.sin, 0, Math.PI, 10)).toBe(
			1.983_523_537_509_454_6,
		);
		expect(trapezoidalRule(Math.sin, 0, Math.PI, 1000)).toBe(
			1.999_998_355_065_662_4,
		);
	});

	it("continuedFractionEval", () => {
		const phi = continuedFractionEval({
			numerator: () => 1,
			denominator: () => 1,
		});
		expect(phi.value).toBe(1.618_033_988_749_895);
		expect(phi.iterations).toBe(38);
		expect(phi.converged).toBe(true);
	});

	it("ConvergenceResult", () => {
		const result = continuedFractionEval(
			{ numerator: () => 1, denominator: () => 1 },
			{ maxIterations: 5 },
		);
		expect(result.converged).toBe(false);
	});

	it("ConvergenceError", () => {
		expect(() =>
			regularizedIncompleteGamma(3, 20, { maxIterations: 2 }),
		).toThrow(new ConvergenceError("regularizedIncompleteGamma", 2));
	});
});
