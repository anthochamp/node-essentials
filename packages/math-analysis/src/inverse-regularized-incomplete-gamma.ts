import {
	assertIncompleteGammaDomain_,
	incompleteGammaScale_,
} from "./_incomplete-gamma.js";
import { normalQuantileGuess_ } from "./_normal-quantile-guess.js";
import type { ConvergenceOptions } from "./convergence-options.js";
import { regularizedIncompleteGammaUpper } from "./regularized-incomplete-gamma-upper.js";
import { regularizedIncompleteGamma } from "./regularized-incomplete-gamma.js";

/** Smallest starting point, so the first density evaluation is not at zero. */
const MIN_START_ = 1e-3;

/**
 * Default relative step below which the iterate is taken as converged.
 *
 * Four ulps rather than one: the residual being driven to zero is itself a
 * forward evaluation carrying tens of ulps, so a one-ulp step is not attainable
 * — the iteration reaches the right answer in three steps and then oscillates
 * between adjacent floats forever, which is what exhausted the budget before
 * this was measured.
 */
const DEFAULT_TOLERANCE_ = 4 * Number.EPSILON;

/**
 * A starting point good to a few digits, from which Halley's method reaches
 * full precision in three or four steps.
 *
 * Two regimes, because no single approximation covers both: above `a = 1` the
 * Wilson–Hilferty transform maps a normal quantile onto the gamma, and below it
 * the distribution is too skewed for that, so the series and the exponential
 * tail are inverted piecewise instead.
 */
function initialGuess_(a: number, p: number): number {
	if (a > 1) {
		const z = normalQuantileGuess_(p);

		return Math.max(
			MIN_START_,
			a * (1 - 1 / (9 * a) + z / (3 * Math.sqrt(a))) ** 3,
		);
	}

	// `P(a, 1)` to within a few percent, which is where the two branches meet.
	const crossover = 1 - a * (0.253 + a * 0.12);

	return p < crossover
		? (p / crossover) ** (1 / a)
		: 1 - Math.log1p(-(p - crossover) / (1 - crossover));
}

/**
 * The inverse of {@link regularizedIncompleteGamma} in its second argument: the
 * `x` at which `P(a, x)` equals `p`.
 *
 * This is the quantile function — the "which value sits at the 95th
 * percentile?" direction, where `P` answers "which percentile is this value
 * at?". It is what the `Gamma`, `ChiSquared` and `Poisson` quantiles in
 * `@ac-kit/math-stats` are built on, and what turns a confidence level into a
 * critical value.
 *
 * Accurate to within a few ulps in the round trip: feeding the result back
 * through `P` returns the `p` you started from to about `1e-15` relative.
 *
 * O(`maxIterations`) evaluations of `P` or `Q` in the worst case; three or four
 * in practice, because convergence is cubic. O(1) memory.
 *
 * @example
 * 	```ts
 * 	const median = inverseRegularizedIncompleteGamma(3, 0.5); // 2.674060313723559
 * 	regularizedIncompleteGamma(3, median); // 0.4999999999999999 — back where we started
 * 	```;
 *
 * @param a Shape parameter, positive.
 * @param p Probability, in `[0, 1]`.
 * @param options Termination criteria; `tolerance` is compared against the
 *   relative size of the refinement step and defaults to `Number.EPSILON`,
 *   `maxIterations` to 100.
 * @returns The `x` with `P(a, x) = p`; `0` at `p = 0` and `Infinity` at `p =
 *   1`.
 * @throws {RangeError} When `a ≤ 0` or `p` is outside `[0, 1]`.
 * @see {@link regularizedIncompleteGamma} for the forward direction.
 * @see [Incomplete gamma and beta](https://anthochamp.github.io/node-essentials/topics/math/functions/incomplete-gamma-beta/)
 */
export function inverseRegularizedIncompleteGamma(
	a: number,
	p: number,
	options?: ConvergenceOptions,
): number {
	// Halley's method rather than Newton's: the second-derivative term is one
	// extra multiply, since `P`'s log-derivative is already in hand, and it turns
	// quadratic convergence into cubic. The residual is measured against
	// whichever of `P` and `Q` is small at the current iterate, so a quantile far
	// out in either tail is refined against a quantity that still has digits.
	assertIncompleteGammaDomain_("inverseRegularizedIncompleteGamma", a, 0);

	if (!(p >= 0 && p <= 1)) {
		throw new RangeError(
			`inverseRegularizedIncompleteGamma: p must be in [0, 1], got ${p}`,
		);
	}

	if (p === 0) {
		return 0;
	}
	if (p === 1) {
		return Number.POSITIVE_INFINITY;
	}

	const tolerance = options?.tolerance ?? DEFAULT_TOLERANCE_;
	const maxIterations = options?.maxIterations ?? 100;
	const { signal } = options ?? {};

	let x = initialGuess_(a, p);
	// Halley alone is not enough: the Wilson–Hilferty guess can be orders of
	// magnitude out in a far tail, and an unbracketed step from there either
	// overshoots past zero or stalls on a density that has underflowed. The
	// bracket makes every iteration either a Halley step that provably improves
	// or a bisection that provably halves, so the loop cannot wander.
	let lower = 0;
	let upper = Number.POSITIVE_INFINITY;
	// The iterate that came closest, rather than the last one tried: past the
	// point where the forward evaluation's own noise dominates, later iterates are
	// not better, only different.
	let best = x;
	let bestResidual = Number.POSITIVE_INFINITY;

	for (let index = 0; index < maxIterations; index++) {
		signal?.throwIfAborted();

		if (x <= 0) {
			return 0;
		}

		// Measured against whichever tail is the small one, so a quantile far out
		// in either direction is refined against a value that still has digits.
		const residual =
			p <= 0.5
				? regularizedIncompleteGamma(a, x, options) - p
				: 1 - p - regularizedIncompleteGammaUpper(a, x, options);

		if (residual === 0) {
			return x;
		}
		if (Math.abs(residual) < bestResidual) {
			bestResidual = Math.abs(residual);
			best = x;
		}
		if (residual > 0) {
			upper = x;
		} else {
			lower = x;
		}

		const density = incompleteGammaScale_(a, x) / x;
		const newton = density > 0 ? residual / density : 0;
		// Halley's correction, clamped because the curvature term overshoots
		// wildly while the iterate is still far from the root.
		const step = newton / (1 - 0.5 * Math.min(1, newton * ((a - 1) / x - 1)));

		// Checked before the bracket below: once the step is under an ulp of `x` it
		// lands back on `x` itself, which the bracket reads as an escape and answers
		// with a bisection that throws the converged answer away.
		if (Math.abs(step) < tolerance * x) {
			return x - step;
		}

		let next = x - step;
		if (!(next > lower && next < upper)) {
			// Outside the bracket, so the local model is not to be trusted: halve
			// the bracket instead, or reach for a finite upper end if there is none.
			next = Number.isFinite(upper) ? 0.5 * (lower + upper) : 2 * x;
		}

		if (next === x || upper - lower < tolerance * x) {
			return best;
		}

		x = next;
	}

	return best;
}
