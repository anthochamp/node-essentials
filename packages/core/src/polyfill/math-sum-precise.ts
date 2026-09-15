import { PreciseSum } from "../number/precise-sum.js";

/**
 * Exactly-rounded sum of `values` — the result is the binary64 nearest to the
 * true mathematical sum, as if every addition were performed at infinite
 * precision and rounded once at the end.
 *
 * A polyfill of the `Math.sumPrecise` proposal, using Shewchuk's
 * partial-expansion algorithm (the one behind Python's `math.fsum`): each term
 * is folded into a list of non-overlapping partial sums that together represent
 * the running total exactly. See {@link PreciseSum} for the same algorithm as
 * an accumulator, for loops that feed several totals at once.
 *
 * **When to reach for it, and when to let the caller decide.** A naive `+=`
 * loop loses accuracy through cancellation, not through length: summing a
 * million same-signed values of similar magnitude is nearly exact, while
 * summing three values that nearly cancel can lose every significant bit.
 *
 * - Use it **unconditionally** where terms differ in sign or in magnitude —
 *   squared deviations from a mean, reciprocals, logarithms, inverse-variance
 *   weights. There the naive answer can be arbitrarily wrong, so speed is not a
 *   trade worth offering.
 * - Offer the caller a **choice** only where the summation is a documented hot
 *   path _and_ the terms are known to share a sign and a magnitude, which is
 *   the case where naive summation is already close to exact.
 * - Never offer the choice merely because the input may be large. Length alone
 *   does not motivate it, and an option that nobody can answer correctly is
 *   worse than no option.
 *
 * O(n·k) additions, where k is the number of live partials — 1 or 2 for
 * well-conditioned input, and bounded by the exponent range at worst.
 *
 * Intermediate overflow is compensated: a running partial that leaves the
 * finite range is counted rather than lost, so `[MAX_VALUE, MAX_VALUE,
 * -MAX_VALUE, -MAX_VALUE]` answers `0` where a naive sum answers `NaN` and
 * Python's `math.fsum` refuses the case outright.
 *
 * Exact summation only removes the error of the **additions**. When the terms
 * are themselves products, round each one first with `@ac-kit/math-scalar`'s
 * `diffOfProducts` or `sumOfProducts`; a term that arrives already wrong cannot
 * be recovered here.
 *
 * @param values The terms to add.
 * @returns The exactly-rounded sum. `-0` for an empty input, matching the
 *   proposal; `NaN` if any term is `NaN` or if both infinities are present.
 */
export function sumPrecise(values: Iterable<number>): number {
	const total = new PreciseSum();

	for (const value of values) {
		total.add(value);
	}

	return total.value;
}
