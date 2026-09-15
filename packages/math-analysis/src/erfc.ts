import { regularizedIncompleteGammaUpper } from "./regularized-incomplete-gamma-upper.js";
import { regularizedIncompleteGamma } from "./regularized-incomplete-gamma.js";

/**
 * The complementary error function `erfc(x) = 1 − erf(x)` — how much of a bell
 * curve lies _beyond_ a given distance from its centre.
 *
 * This is the one you want for a tail probability, a p-value, or any "how
 * unlikely is this?" question. It is not a convenience wrapper: computing it as
 * `1 - erf(x)` loses the entire answer once `erf(x)` rounds to 1, from about `x
 * = 6`. Computed directly, it keeps full relative precision down to the
 * underflow limit near `x = 26.5`, which is what makes a normal tail
 * probability of `1e-100` computable at all.
 *
 * The rule generalises across this package: **reach for the upper form when the
 * answer is small.**
 *
 * O(1) time, O(1) memory in the sense that matters to a caller: the underlying
 * expansion is iterative but bounded, and allocates nothing.
 *
 * @example
 * 	```ts
 * 	erfc(6); // 2.1519736712498916e-17
 * 	1 - erf(6); // 0 — the same quantity, computed the wrong way
 * 	erfc(20); // 5.395865611607905e-176
 * 	```;
 *
 * @param x Any real.
 * @returns `erfc(x)`, in `[0, 2]`.
 * @see {@link erf} when the answer is near 0 rather than near 1.
 * @see [The error function](https://anthochamp.github.io/node-essentials/topics/math/functions/error-functions/)
 */
export function erfc(x: number): number {
	if (Number.isNaN(x)) {
		return Number.NaN;
	}

	// The positive branch goes through the upper incomplete gamma, which computes
	// the tail directly; the negative branch is near 2 and has nothing to lose, so
	// it takes the lower form.
	const squared = x * x;
	// Past `|x| ≈ 1.3e154` the square overflows, long after erfc itself saturated.
	if (!Number.isFinite(squared)) {
		return x < 0 ? 2 : 0;
	}

	return x < 0
		? 1 + regularizedIncompleteGamma(0.5, squared)
		: regularizedIncompleteGammaUpper(0.5, squared);
}
