import { logGamma } from "@ac-kit/math-analysis";

/**
 * `ln C(n, k)`, the log of the binomial coefficient.
 *
 * Through log-gammas rather than through `@ac-kit/math-combinatorics`'s exact
 * `binomial`: that returns a `bigint` because the coefficient outgrows binary64
 * — `C(1030, 515)` already does — and every consumer here immediately
 * multiplies it by probabilities small enough to bring the product back into
 * range. Converting the exact value to a `number` first would overflow to
 * `Infinity` on the way, so the log is not a shortcut but the only route.
 *
 * @param n Upper index, a non-negative integer.
 * @param k Lower index, in `[0, n]`.
 * @returns `ln C(n, k)`.
 */
export function logBinomial_(n: number, k: number): number {
	return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}
