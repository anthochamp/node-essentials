import type { ConvergenceOptions } from "./convergence-options.js";
import type { ConvergenceResult } from "./convergence-result.js";

/**
 * Smallest magnitude a vanishing partial is rescued to.
 *
 * Lentz's method divides by its running denominator, so a zero there is fatal.
 * Substituting a value this small perturbs the result by less than the working
 * precision — the standard choice of `smallest normal / ε`.
 */
const TINY_ = 2 ** -1022 / Number.EPSILON;

/**
 * The coefficients of `b₀ + a₁/(b₁ + a₂/(b₂ + a₃/(b₃ + ⋯)))`, supplied as
 * functions of the term index so an unbounded fraction needs no array.
 *
 * @example
 * 	```ts
 * 	// Every coefficient is 1, for any depth.
 * 	const goldenRatio: ContinuedFraction = {
 * 		numerator: () => 1,
 * 		denominator: () => 1,
 * 	};
 * 	```;
 *
 * @see [Continued fractions](https://anthochamp.github.io/node-essentials/topics/math/calculus/series/)
 */
export type ContinuedFraction = {
	/** The partial numerator `aⱼ`, called with `index ≥ 1`. */
	numerator: (index: number) => number;

	/**
	 * The partial denominator `bⱼ`, called with `index ≥ 0`. `b₀` is the leading
	 * term, outside the fraction proper.
	 */
	denominator: (index: number) => number;
};

/**
 * Evaluates a continued fraction — an expression of the form `b₀ + a₁/(b₁ +
 * a₂/(b₂ + ⋯))` that in principle never ends.
 *
 * Many functions have a continued fraction that converges far faster than their
 * power series, especially away from the origin, which is why the incomplete
 * gamma and beta in this package are built on one. This evaluates such a
 * fraction without having to decide up front how deep to go: the running value
 * is multiplied by a factor tending to 1, and the iteration stops when that
 * factor is within `tolerance` of 1.
 *
 * It reports rather than throws. A fraction that exhausts `maxIterations` still
 * returns its best estimate, with `converged: false` — check it before trusting
 * the value.
 *
 * O(`maxIterations`) calls to each of {@link ContinuedFraction.numerator} and
 * {@link ContinuedFraction.denominator}, and the same count of divisions. O(1)
 * memory: the coefficients are functions of the index, so an unbounded fraction
 * needs no array.
 *
 * @example
 * 	```ts
 * 	// 1 + 1/(1 + 1/(1 + ⋯)) is the golden ratio.
 * 	const phi = continuedFractionEval({
 * 		numerator: () => 1,
 * 		denominator: () => 1,
 * 	});
 * 	phi.value; // 1.618033988749895
 * 	phi.iterations; // 38
 * 	phi.converged; // true
 * 	```;
 *
 * @param fraction The partial numerators and denominators.
 * @param options Termination criteria. `tolerance` is compared against the
 *   distance from 1 of the multiplicative update, so it is relative; it
 *   defaults to `Number.EPSILON` and `maxIterations` to 300.
 * @returns The fraction's value, the iteration count, and whether the tolerance
 *   was met.
 * @see [Continued fractions](https://anthochamp.github.io/node-essentials/topics/math/calculus/series/)
 */
export function continuedFractionEval(
	fraction: ContinuedFraction,
	options?: ConvergenceOptions,
): ConvergenceResult<number> {
	// The modified Lentz algorithm, which works forwards from `b₀`. The backward
	// evaluation it replaces has to pick a depth up front and re-run the whole
	// fraction when the pick was too shallow.
	const tolerance = options?.tolerance ?? Number.EPSILON;
	const maxIterations = options?.maxIterations ?? 300;
	const { signal } = options ?? {};
	const { numerator, denominator } = fraction;

	let value = denominator(0);
	if (value === 0) {
		value = TINY_;
	}

	// `c` and `d` carry the forward recurrence's numerator and denominator
	// ratios; their product is the update applied to `value` each step.
	let c = value;
	let d = 0;

	for (let index = 1; index <= maxIterations; index++) {
		signal?.throwIfAborted();

		const a = numerator(index);
		const b = denominator(index);

		d = b + a * d;
		if (d === 0) {
			d = TINY_;
		}

		c = b + a / c;
		if (c === 0) {
			c = TINY_;
		}

		d = 1 / d;

		const update = c * d;
		value *= update;

		if (Math.abs(update - 1) < tolerance) {
			return { value, iterations: index, converged: true };
		}
	}

	return { value, iterations: maxIterations, converged: false };
}
