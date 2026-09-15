import { continuedFractionEval } from "./continued-fraction-eval.js";
import type { ConvergenceOptions } from "./convergence-options.js";
import type { ConvergenceResult } from "./convergence-result.js";

/**
 * Scales with the shapes for the same reason the incomplete gamma's does: the
 * fraction's convergence slows as the parameters grow.
 */
function maxIterations_(a: number, b: number): number {
	return Math.max(1000, Math.ceil(20 * Math.sqrt(a + b)));
}

/**
 * Rejects shape parameters the beta function is not defined for.
 *
 * @param routine Name of the calling export, for the message.
 * @param a First shape parameter, which must be positive.
 * @param b Second shape parameter, which must be positive.
 * @throws {RangeError} When either parameter is non-positive.
 */
export function assertBetaShape_(routine: string, a: number, b: number): void {
	if (!(a > 0)) {
		throw new RangeError(`${routine}: a must be positive, got ${a}`);
	}
	if (!(b > 0)) {
		throw new RangeError(`${routine}: b must be positive, got ${b}`);
	}
}

/**
 * The continued fraction `K` behind the regularized incomplete beta, in the
 * form `Iₓ(a, b) = xᵃ(1−x)ᵇ / (a · B(a, b) · K)`.
 *
 * Converges quickly only for `x < (a + 1) / (a + b + 2)`; the caller reaches
 * the other half of the domain through the symmetry `Iₓ(a, b) = 1 − I₁₋ₓ(b, a)`
 * rather than by pushing this past its useful range.
 *
 * @param a First shape parameter, positive.
 * @param b Second shape parameter, positive.
 * @param x Point of evaluation, in `(0, 1)`.
 * @param options Termination criteria.
 * @returns `K`, the term count and whether the tolerance was met.
 */
export function betaContinuedFraction_(
	a: number,
	b: number,
	x: number,
	options?: ConvergenceOptions,
): ConvergenceResult<number> {
	return continuedFractionEval(
		{
			numerator: (index) => {
				const step = Math.floor(index / 2);

				return index % 2 === 0
					? (step * (b - step) * x) / ((a + 2 * step - 1) * (a + 2 * step))
					: (-(a + step) * (a + b + step) * x) /
							((a + 2 * step) * (a + 2 * step + 1));
			},
			denominator: () => 1,
		},
		{
			tolerance: options?.tolerance ?? Number.EPSILON,
			maxIterations: options?.maxIterations ?? maxIterations_(a, b),
			signal: options?.signal,
		},
	);
}
