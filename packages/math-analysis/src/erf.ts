import { regularizedIncompleteGamma } from "./regularized-incomplete-gamma.js";

/**
 * The error function `erf(x) = 2/√π ∫₀ˣ e^(−t²) dt` — how much of a bell curve
 * lies within a given distance of its centre.
 *
 * Concretely: `erf(x)` is the probability that a standard normal measurement
 * lands within `x√2` of its mean. It is what turns "three sigma" into a number,
 * and it is the building block of every normal-distribution tail probability.
 *
 * Reach for {@link erfc} whenever the answer is near 1. `erf` saturates to
 * exactly 1 at about `x = 6`, so `1 - erf(x)` past that point returns zero
 * rather than a small number, and the quantity you wanted is gone.
 *
 * O(1) time, O(1) memory in the sense that matters to a caller: the underlying
 * expansion is iterative but bounded, and allocates nothing.
 *
 * @example
 * 	```ts
 * 	erf(1); // 0.8427007929497148 — ~84% within one √2-sigma
 * 	erf(6); // 1 — saturated; use erfc past here
 * 	```;
 *
 * @param x Any real.
 * @returns `erf(x)`, in `[−1, 1]`.
 * @see {@link erfc} for the complement, and for tail probabilities.
 * @see [The error function](https://anthochamp.github.io/node-essentials/topics/math/functions/error-functions/)
 */
export function erf(x: number): number {
	if (Number.isNaN(x)) {
		return Number.NaN;
	}

	// `sign(x) · P(½, x²)` rather than a dedicated rational approximation: the
	// incomplete gamma already covers this exact integral, and a second fitted
	// polynomial would be a second thing to keep accurate.
	const squared = x * x;
	// Past `|x| ≈ 1.3e154` the square overflows, long after erf itself saturated.
	if (!Number.isFinite(squared)) {
		return Math.sign(x);
	}

	const magnitude = regularizedIncompleteGamma(0.5, squared);

	return x < 0 ? -magnitude : magnitude;
}
