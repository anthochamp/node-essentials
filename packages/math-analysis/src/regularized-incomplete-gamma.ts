import {
	assertIncompleteGammaDomain_,
	gammaLowerSeries_,
	gammaUpperContinuedFraction_,
	preferContinuedFraction_,
} from "./_incomplete-gamma.js";
import { ConvergenceError } from "./convergence-error.js";
import type { ConvergenceOptions } from "./convergence-options.js";

/**
 * The lower regularized incomplete gamma `P(a, x)` — the fraction of a
 * `Gamma(a, 1)` distribution lying at or below `x`.
 *
 * In plain terms it answers "what proportion of outcomes are no bigger than
 * this?", which makes it the cumulative distribution function of the gamma,
 * chi-squared and Poisson families. Feed it a chi-squared statistic and you get
 * the probability of seeing something that small.
 *
 * **Regularized** is spelled out because libraries disagree about whether the
 * bare name means this ratio in `[0, 1]` or the unnormalised integral. Guessing
 * wrong is silent and off by a factor of `Γ(a)`.
 *
 * Reach for {@link regularizedIncompleteGammaUpper} when the answer is near 1:
 * `1 - P` there has already thrown away the digits the upper form keeps, which
 * is the difference between a p-value of `1e-12` and a p-value of `0`.
 *
 * Relative error is within a few ulps for ordinary parameters and stays under
 * about `5e-13` for large ones.
 *
 * O(`maxIterations`) calls to the underlying expansion in the worst case, and
 * far fewer in practice; O(1) memory.
 *
 * @example
 * 	```ts
 * 	regularizedIncompleteGamma(0.5, 1); // 0.8427007929497148 — this is erf(1)
 * 	regularizedIncompleteGamma(3, 20); // 0.9999995444850495
 * 	1 - regularizedIncompleteGamma(3, 20); // 4.5551495053697266e-7 — only 9 good digits
 * 	```;
 *
 * @param a Shape parameter, positive.
 * @param x Upper limit, non-negative.
 * @param options Termination criteria; `tolerance` is relative and defaults to
 *   `Number.EPSILON`, `maxIterations` to 1000.
 * @returns `P(a, x)`, in `[0, 1]`.
 * @throws {RangeError} When `a ≤ 0` or `x < 0`.
 * @throws {ConvergenceError} When neither expansion met the tolerance.
 * @see {@link regularizedIncompleteGammaUpper} when the answer is small.
 * @see {@link inverseRegularizedIncompleteGamma} to go the other way.
 * @see [Incomplete gamma and beta](https://anthochamp.github.io/node-essentials/topics/math/functions/incomplete-gamma-beta/)
 */
export function regularizedIncompleteGamma(
	a: number,
	x: number,
	options?: ConvergenceOptions,
): number {
	assertIncompleteGammaDomain_("regularizedIncompleteGamma", a, x);

	if (x === 0) {
		return 0;
	}

	const useFraction = preferContinuedFraction_(a, x);
	const result = useFraction
		? gammaUpperContinuedFraction_(a, x, options)
		: gammaLowerSeries_(a, x, options);

	if (!result.converged) {
		throw new ConvergenceError("regularizedIncompleteGamma", result.iterations);
	}

	return useFraction ? 1 - result.value : result.value;
}
