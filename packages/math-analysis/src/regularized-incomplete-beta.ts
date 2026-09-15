import { betaPowerTerms_ } from "./_beta-power-terms.js";
import {
	assertBetaShape_,
	betaContinuedFraction_,
} from "./_incomplete-beta.js";
import { ConvergenceError } from "./convergence-error.js";
import type { ConvergenceOptions } from "./convergence-options.js";

/**
 * The regularized incomplete beta `Iₓ(a, b)` — the fraction of a `Beta(a, b)`
 * distribution lying at or below `x`.
 *
 * The Beta distribution describes a proportion — a success rate, a share, a
 * probability you are uncertain about — and this is its cumulative function.
 * Through it come the tail probabilities of Student's _t_, the _F_ distribution
 * and the binomial, which is why it turns up far more often than its name
 * suggests.
 *
 * **Regularized** is stated rather than implied: this is the ratio in `[0, 1]`,
 * not the unnormalised integral `B(x; a, b)`. Libraries disagree on which the
 * bare name means, and {@link regularizedIncompleteGamma} spells it out for the
 * same reason.
 *
 * Relative error is a few ulps for ordinary parameters and stays within a few
 * dozen for extreme ones.
 *
 * O(`maxIterations`) continued-fraction steps in the worst case, and far fewer
 * in practice; O(1) memory.
 *
 * @example
 * 	```ts
 * 	regularizedIncompleteBeta(2, 3, 0.5); // 0.6875
 * 	regularizedIncompleteBeta(0.5, 0.5, 0.5); // 0.49999999999999944 — the arcsine law
 * 	```;
 *
 * @param a First shape parameter, positive.
 * @param b Second shape parameter, positive.
 * @param x Point of evaluation, in `[0, 1]`.
 * @param options Termination criteria; `tolerance` is relative and defaults to
 *   `Number.EPSILON`, `maxIterations` to 1000.
 * @returns `Iₓ(a, b)`, in `[0, 1]`.
 * @throws {RangeError} When `a ≤ 0`, `b ≤ 0`, or `x` is outside `[0, 1]`.
 * @throws {ConvergenceError} When the continued fraction met no tolerance.
 * @see {@link inverseRegularizedIncompleteBeta} to go the other way.
 * @see [Incomplete gamma and beta](https://anthochamp.github.io/node-essentials/topics/math/functions/incomplete-gamma-beta/)
 */
export function regularizedIncompleteBeta(
	a: number,
	b: number,
	x: number,
	options?: ConvergenceOptions,
): number {
	assertBetaShape_("regularizedIncompleteBeta", a, b);

	if (!(x >= 0 && x <= 1)) {
		throw new RangeError(
			`regularizedIncompleteBeta: x must be in [0, 1], got ${x}`,
		);
	}

	if (x === 0 || x === 1) {
		return x;
	}

	// Evaluated by swapping the arguments rather than by recursing: at the
	// crossover point itself both sides land on the same branch, so a recursive
	// call there never terminates.
	const direct = x < (a + 1) / (a + b + 2);
	const shapeA = direct ? a : b;
	const shapeB = direct ? b : a;
	const point = direct ? x : 1 - x;
	// Carried rather than re-derived as `1 - point`, which would round away the
	// small operand exactly when the swap was made to keep it.
	const complement = direct ? 1 - x : x;

	const fraction = betaContinuedFraction_(shapeA, shapeB, point, options);
	if (!fraction.converged) {
		throw new ConvergenceError(
			"regularizedIncompleteBeta",
			fraction.iterations,
		);
	}

	const front = betaPowerTerms_(shapeA, shapeB, point, complement);
	const value = front / (shapeA * fraction.value);

	return direct ? value : 1 - value;
}
