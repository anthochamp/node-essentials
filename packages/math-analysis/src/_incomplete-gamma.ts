import { SQRT_TWO_PI } from "@ac-kit/math-scalar";

import { expSplit_ } from "./_exp-split.js";
import { LANCZOS_G_, lanczosSeries_ } from "./_lanczos.js";
import { log1pmx_ } from "./_log1pmx.js";
import { continuedFractionEval } from "./continued-fraction-eval.js";
import type { ConvergenceOptions } from "./convergence-options.js";
import type { ConvergenceResult } from "./convergence-result.js";

/**
 * Default iteration cap, which has to scale with the shape parameter.
 *
 * The series' successive terms shrink by `x / (a + n)`, so the count needed to
 * reach `ε` grows like `√(72a)` — about 1900 at `a = 50000`, where a flat cap
 * of a thousand reported a false non-convergence. Twenty times `√a` clears that
 * with margin and costs nothing at small `a`, where the loop exits on tolerance
 * long before.
 */
function maxIterations_(a: number): number {
	return Math.max(1000, Math.ceil(20 * Math.sqrt(a)));
}

/**
 * Whether the continued fraction, rather than the series, is the expansion to
 * run at `(a, x)`.
 *
 * Not the textbook `x ≥ a + 1`. That rule picks the expansion by convergence
 * speed alone and ignores which of `P` and `Q` the caller is after: at `a =
 * 0.05, x = 1` it routes to the series, leaving the upper form to reach a tail
 * of `0.003` through `1 − 0.997` and throwing away two and a half bits.
 * Measured, that cost 327 ulps where this rule costs a handful.
 *
 * `x ≥ 1 ∧ x ≥ a` is Cephes' condition, and it splits the domain by which tail
 * is small: below it `x` sits left of the mode, so `P` is the small one and `Q`
 * is safely `1 − P`; above it the roles swap and the fraction computes the
 * small tail directly.
 */
export function preferContinuedFraction_(a: number, x: number): boolean {
	return x >= 1 && x >= a;
}

/**
 * Rejects the arguments neither expansion is defined for, naming the public
 * routine rather than this module.
 *
 * @param routine Name of the calling export, for the message.
 * @param a Shape parameter, which must be positive.
 * @param x Integration limit, which must be non-negative.
 * @throws {RangeError} When either argument is outside its domain.
 */
export function assertIncompleteGammaDomain_(
	routine: string,
	a: number,
	x: number,
): void {
	if (!(a > 0)) {
		throw new RangeError(`${routine}: a must be positive, got ${a}`);
	}
	if (!(x >= 0)) {
		throw new RangeError(`${routine}: x must be non-negative, got ${x}`);
	}
}

/**
 * The factor `e^(−x) · xᵃ / Γ(a)` both expansions are scaled by, and the
 * density `Γ(a, x)` differentiates to once divided by `x`.
 *
 * Not computed as `exp(a·ln x − ln Γ(a))`. That form is accurate to one ulp
 * _relatively_ in each log, but `ln Γ(100)` is 359, so one ulp of it is `4e-14`
 * _absolutely_ — and `exp` turns an absolute error in its argument into a
 * relative error in its result. Measured, that put `P(100, 90)` `5e-14` out
 * with everything else exact.
 *
 * Substituting the Lanczos form of `Γ(a)` gives the exponent as a sum of two
 * pieces, in whichever of two algebraically identical splits keeps both small:
 * near `x ≈ a` that is `a·log1pmx(d) − (g − ½)·d`, and far from it `a·ln(1 + d)
 * \+ (agh − x)`, where `agh = a + g − ½` and `d = (x − agh)/agh`.
 *
 * The two pieces are then exponentiated **separately and multiplied**, never
 * added: their sum is a number of order `ln Γ(a)` whose own last bit is the
 * error this exists to avoid. Adding them is the fallback only when one piece
 * alone would overflow `exp`, which is where the result saturates anyway.
 */
export function incompleteGammaScale_(a: number, x: number): number {
	const agh = a + LANCZOS_G_ - 0.5;
	const d = (x - agh) / agh;

	const [first, second] =
		Math.abs(d) <= 0.5
			? [a * log1pmx_(d), -(LANCZOS_G_ - 0.5) * d]
			: // `log1p(d)` would have to rebuild `x/agh` from a `d` sitting next to
				// −1, losing every digit the ratio has; taking the ratio directly
				// costs nothing here because the two are far apart.
				[a * Math.log(x / agh), agh - x];

	return (
		(expSplit_(first, second) * Math.sqrt(agh)) /
		(SQRT_TWO_PI * lanczosSeries_(a - 1))
	);
}

/**
 * The lower regularized incomplete gamma `P(a, x)` by its power series.
 *
 * Every term is positive, so there is no cancellation to compensate for and a
 * naive running total is already exact to within the terms' own rounding.
 * Measured against a 60-digit reference, the sum is exact to the last bit and
 * Neumaier compensation changes nothing: the error that used to show up here
 * was {@link incompleteGammaScale_}'s, not this loop's.
 *
 * Converges in O(√a) terms for `x < a + 1`, and unusably slowly above that —
 * use {@link gammaUpperContinuedFraction_} there.
 *
 * @param a Shape parameter, positive.
 * @param x Upper limit of integration, positive.
 * @param options Termination criteria.
 * @returns `P(a, x)`, the term count and whether the tolerance was met.
 */
export function gammaLowerSeries_(
	a: number,
	x: number,
	options?: ConvergenceOptions,
): ConvergenceResult<number> {
	const tolerance = options?.tolerance ?? Number.EPSILON;
	const maxIterations = options?.maxIterations ?? maxIterations_(a);
	const { signal } = options ?? {};

	let term = 1 / a;
	let total = term;
	let denominator = a;

	for (let index = 1; index <= maxIterations; index++) {
		signal?.throwIfAborted();

		denominator += 1;
		term *= x / denominator;
		total += term;

		if (Math.abs(term) < Math.abs(total) * tolerance) {
			return {
				value: total * incompleteGammaScale_(a, x),
				iterations: index,
				converged: true,
			};
		}
	}

	return {
		value: total * incompleteGammaScale_(a, x),
		iterations: maxIterations,
		converged: false,
	};
}

/**
 * The upper regularized incomplete gamma `Q(a, x)` by Legendre's continued
 * fraction, evaluated with {@link continuedFractionEval}.
 *
 * Converges quickly for `x ≥ a + 1`, which is exactly where
 * {@link gammaLowerSeries_} stops being usable.
 *
 * @param a Shape parameter, positive.
 * @param x Lower limit of integration, positive.
 * @param options Termination criteria.
 * @returns `Q(a, x)`, the term count and whether the tolerance was met.
 */
export function gammaUpperContinuedFraction_(
	a: number,
	x: number,
	options?: ConvergenceOptions,
): ConvergenceResult<number> {
	const fraction = continuedFractionEval(
		{
			numerator: (index) => (index === 1 ? 1 : -(index - 1) * (index - 1 - a)),
			denominator: (index) => (index === 0 ? 0 : x + 2 * index - 1 - a),
		},
		{
			tolerance: options?.tolerance ?? Number.EPSILON,
			maxIterations: options?.maxIterations ?? maxIterations_(a),
			signal: options?.signal,
		},
	);

	return {
		value: fraction.value * incompleteGammaScale_(a, x),
		iterations: fraction.iterations,
		converged: fraction.converged,
	};
}
