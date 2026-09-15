import { betaPowerTerms_ } from "./_beta-power-terms.js";
import { assertBetaShape_ } from "./_incomplete-beta.js";
import { normalQuantileGuess_ } from "./_normal-quantile-guess.js";
import type { ConvergenceOptions } from "./convergence-options.js";
import { regularizedIncompleteBeta } from "./regularized-incomplete-beta.js";

/**
 * Default relative step below which the iterate is taken as converged. Four
 * ulps, for the reason given on the gamma inverse's own constant.
 */
const DEFAULT_TOLERANCE_ = 4 * Number.EPSILON;

/**
 * A starting point good to a few digits.
 *
 * With both shapes at or above 1 the distribution is close enough to normal for
 * the Carter–Wilson transform of a normal quantile to land nearby. Below that
 * the mass piles up at one or both endpoints, so each end is inverted from its
 * own leading power term instead.
 */
function initialGuess_(a: number, b: number, p: number): number {
	if (a >= 1 && b >= 1) {
		const z = normalQuantileGuess_(p);
		const squared = (z * z - 3) / 6;
		const harmonic = 2 / (1 / (2 * a - 1) + 1 / (2 * b - 1));
		const correction =
			(z * Math.sqrt(squared + harmonic)) / harmonic -
			(1 / (2 * b - 1) - 1 / (2 * a - 1)) *
				(squared + 5 / 6 - 2 / (3 * harmonic));

		return a / (a + b * Math.exp(2 * correction));
	}

	const lowerWeight = (a / (a + b)) ** a / a;
	const upperWeight = (b / (a + b)) ** b / b;
	const total = lowerWeight + upperWeight;

	return p < lowerWeight / total
		? (a * total * p) ** (1 / a)
		: 1 - (b * total * (1 - p)) ** (1 / b);
}

/**
 * The inverse of {@link regularizedIncompleteBeta} in its third argument: the
 * `x` at which `Iₓ(a, b)` equals `p`.
 *
 * The quantile function of a `Beta(a, b)` distribution, and what the `Beta`,
 * `F` and `StudentT` quantiles in `@ac-kit/math-stats` are built on. Use it to
 * turn a confidence level into a critical value, or a percentile into the
 * proportion that sits there.
 *
 * Accurate to within a few ulps in the round trip: feeding the result back
 * through `Iₓ` returns the `p` you started from to about `1e-15` relative.
 *
 * O(`maxIterations`) evaluations of `Iₓ` in the worst case; three or four in
 * practice, because convergence is cubic. O(1) memory.
 *
 * @example
 * 	```ts
 * 	inverseRegularizedIncompleteBeta(2, 3, 0.5); // 0.38572756813238934
 * 	```;
 *
 * @param a First shape parameter, positive.
 * @param b Second shape parameter, positive.
 * @param p Probability, in `[0, 1]`.
 * @param options Termination criteria; `tolerance` is compared against the
 *   relative size of the refinement step and defaults to `Number.EPSILON`,
 *   `maxIterations` to 100.
 * @returns The `x` with `Iₓ(a, b) = p`; `0` at `p = 0` and `1` at `p = 1`.
 * @throws {RangeError} When `a ≤ 0`, `b ≤ 0`, or `p` is outside `[0, 1]`.
 * @see {@link regularizedIncompleteBeta} for the forward direction.
 * @see [Incomplete gamma and beta](https://anthochamp.github.io/node-essentials/topics/math/functions/incomplete-gamma-beta/)
 */
export function inverseRegularizedIncompleteBeta(
	a: number,
	b: number,
	p: number,
	options?: ConvergenceOptions,
): number {
	// Halley's method, for the same reason as the gamma inverse: the curvature
	// term costs one multiply and buys cubic convergence. The iterate is kept
	// strictly inside `(0, 1)` by halving back toward the endpoint it overshot,
	// since the density is unbounded there for shapes below 1 and a single step
	// past the edge is unrecoverable.
	assertBetaShape_("inverseRegularizedIncompleteBeta", a, b);

	if (!(p >= 0 && p <= 1)) {
		throw new RangeError(
			`inverseRegularizedIncompleteBeta: p must be in [0, 1], got ${p}`,
		);
	}

	if (p === 0 || p === 1) {
		return p;
	}

	const tolerance = options?.tolerance ?? DEFAULT_TOLERANCE_;
	const maxIterations = options?.maxIterations ?? 100;
	const { signal } = options ?? {};

	// Clamped off the endpoints: for shapes below 1 the guess can land on 0 or 1
	// outright, and the iteration has nowhere to go from there even when the true
	// quantile is a representable float just inside.
	let x = Math.min(
		Math.max(initialGuess_(a, b, p), Number.MIN_VALUE),
		1 - Number.EPSILON / 2,
	);
	// The guess can be far out when the two shapes differ sharply and `p` is
	// extreme — at `a = 1, b = 300, p = 1e-8` it lands nine orders of magnitude
	// away. Bracketing makes every iteration either a Halley step that provably
	// improves or a bisection that provably halves.
	let lower = 0;
	let upper = 1;
	// The closest iterate rather than the last, for the reason given on the gamma
	// inverse.
	let best = x;
	let bestResidual = Number.POSITIVE_INFINITY;

	for (let index = 0; index < maxIterations; index++) {
		signal?.throwIfAborted();

		if (x <= 0 || x >= 1) {
			return x <= 0 ? 0 : 1;
		}

		const complement = 1 - x;
		const residual = regularizedIncompleteBeta(a, b, x, options) - p;

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

		const density = betaPowerTerms_(a, b, x, complement) / (x * complement);
		const newton = density > 0 ? residual / density : 0;
		const step =
			newton /
			(1 - 0.5 * Math.min(1, newton * ((a - 1) / x - (b - 1) / complement)));

		// Checked before the bracket below, for the reason given on the gamma
		// inverse: a sub-ulp step lands back on `x` and would be bisected away.
		if (Math.abs(step) < tolerance * x) {
			return x - step;
		}

		let next = x - step;
		if (!(next > lower && next < upper)) {
			next = 0.5 * (lower + upper);
		}

		if (next === x || upper - lower < tolerance * x) {
			return best;
		}

		x = next;
	}

	return best;
}
