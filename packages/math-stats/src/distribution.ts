import type { RandomFn } from "@ac-kit/core";

/**
 * A probability distribution over the reals, fixed at construction.
 *
 * Every member is resolved from the parameters once, so the shape is a plain
 * object rather than a class: nothing here mutates after the constructing call
 * returns, and `mean` and `variance` are values rather than methods because
 * they are properties of the parameters, not computations over an argument.
 *
 * Discrete families implement the same shape — `density` is then a probability
 * mass, and `quantile` the generalised inverse (the smallest outcome whose
 * cumulative probability reaches the argument).
 */
export type Distribution = {
	/**
	 * Probability density at `x`, or probability mass for a discrete family.
	 *
	 * @param x Point of evaluation.
	 * @returns The density or mass; `0` outside the support.
	 */
	density: (x: number) => number;

	/**
	 * Probability of drawing a value at or below `x`.
	 *
	 * @param x Point of evaluation.
	 * @returns `P(X ≤ x)`, in `[0, 1]`.
	 */
	cdf: (x: number) => number;

	/**
	 * Probability of drawing a value above `x`.
	 *
	 * Not a convenience over `1 - cdf(x)`, and the reason this member exists at
	 * all: a tail of `1e-20` is exactly `0` once computed that way, and a tail is
	 * precisely what a p-value is. Each family computes it directly.
	 *
	 * @param x Point of evaluation.
	 * @returns `P(X > x)`, in `[0, 1]`.
	 */
	survival: (x: number) => number;

	/**
	 * The value at which the cumulative probability reaches `probability`.
	 *
	 * @param probability Probability in `[0, 1]`.
	 * @returns The quantile.
	 * @throws {RangeError} When `probability` is outside `[0, 1]`.
	 */
	quantile: (probability: number) => number;

	/**
	 * One draw from the distribution.
	 *
	 * @param random Uniform source over `[0, 1)`. Defaults to `Math.random`; pass
	 *   a seeded generator from `@ac-kit/math-random` for a reproducible draw.
	 * @returns The drawn value.
	 */
	sample: (random?: RandomFn | null) => number;

	/** Expected value, or `NaN` where the family has none. */
	mean: number;

	/** Variance, or `NaN` where the family has none. */
	variance: number;
};
