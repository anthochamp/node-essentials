import {
	assertIncompleteGammaDomain_,
	gammaLowerSeries_,
	gammaUpperContinuedFraction_,
	preferContinuedFraction_,
} from "./_incomplete-gamma.js";
import { ConvergenceError } from "./convergence-error.js";
import type { ConvergenceOptions } from "./convergence-options.js";

/**
 * The upper regularized incomplete gamma `Q(a, x) = 1 − P(a, x)` — the fraction
 * of a `Gamma(a, 1)` distribution lying above `x`.
 *
 * This is the survival function, and in practice it is the p-value: "how often
 * would chance alone produce a result at least this extreme?". Reach for it
 * whenever the answer is expected to be small, which for a p-value is always.
 *
 * Not a convenience wrapper over {@link regularizedIncompleteGamma}. The tail is
 * computed directly, where `1 - P` subtracts two numbers agreeing to every
 * digit that mattered: a chi-squared p-value of `1e-12` comes out exact here
 * and as `0` there.
 *
 * Relative error is within a few ulps for ordinary parameters and stays under
 * about `5e-13` for large ones.
 *
 * O(`maxIterations`) calls to the underlying expansion in the worst case, and
 * far fewer in practice; O(1) memory.
 *
 * @example
 * 	```ts
 * 	regularizedIncompleteGammaUpper(3, 20); // 4.555149505589215e-7
 * 	1 - regularizedIncompleteGamma(3, 20); // 4.5551495053697266e-7 — diverges at the 10th digit
 * 	```;
 *
 * @param a Shape parameter, positive.
 * @param x Lower limit, non-negative.
 * @param options Termination criteria; `tolerance` is relative and defaults to
 *   `Number.EPSILON`, `maxIterations` to 1000.
 * @returns `Q(a, x)`, in `[0, 1]`.
 * @throws {RangeError} When `a ≤ 0` or `x < 0`.
 * @throws {ConvergenceError} When neither expansion met the tolerance.
 * @see {@link regularizedIncompleteGamma} when the answer is near 0.
 * @see [Incomplete gamma and beta](https://anthochamp.github.io/node-essentials/topics/math/functions/incomplete-gamma-beta/)
 */
export function regularizedIncompleteGammaUpper(
	a: number,
	x: number,
	options?: ConvergenceOptions,
): number {
	assertIncompleteGammaDomain_("regularizedIncompleteGammaUpper", a, x);

	if (x === 0) {
		return 1;
	}

	const useFraction = preferContinuedFraction_(a, x);
	const result = useFraction
		? gammaUpperContinuedFraction_(a, x, options)
		: gammaLowerSeries_(a, x, options);

	if (!result.converged) {
		throw new ConvergenceError(
			"regularizedIncompleteGammaUpper",
			result.iterations,
		);
	}

	return useFraction ? result.value : 1 - result.value;
}
