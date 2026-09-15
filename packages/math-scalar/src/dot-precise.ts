import { twoProductError } from "./two-product.js";
import { twoSumError } from "./two-sum.js";

/**
 * `a[0] * b[0] + a[1] * b[1] + …`, with the rounding error of every product and
 * every addition recovered and folded back in — the N-term generalisation of
 * `sumOfProducts`.
 *
 * The Ogita–Rump–Oishi compensated dot product: the result is as accurate as
 * one computed in doubled precision and rounded once, so it survives the case a
 * naive loop cannot — terms of opposite sign that cancel down to a fraction of
 * any single product, where every surviving bit comes from bits the naive loop
 * threw away.
 *
 * Allocation-free and branch-free over the terms. Measured at 1.4× to 1.9× the
 * naive loop for the two-to-four term cases this exists for, since array access
 * and call overhead dominate the extra arithmetic.
 *
 * Prefer `sumOfProducts` for exactly two terms, which needs no loop. For a
 * variable-length sum whose terms are not products, use `@ac-kit/core`'s
 * `sumPrecise`. Like those, this does not compensate intermediate overflow —
 * `PreciseSum` does.
 *
 * There is no allocation-free way to chain this to a higher arity. A helper
 * that adds one product and returns a single number has already rounded away
 * the bits the next term needs, so chaining such calls compensates each step in
 * isolation and still loses everything to cancellation across the whole. The
 * running compensation has to survive every term, which is what the loop below
 * does and a chain of calls cannot.
 *
 * @param a Left factors.
 * @param b Right factors, paired by index.
 * @returns The compensated dot product, or `0` for empty inputs.
 * @throws {RangeError} If `a` and `b` have different lengths.
 */
export function dotPrecise(a: ArrayLike<number>, b: ArrayLike<number>): number {
	if (a.length !== b.length) {
		throw new RangeError("dotPrecise: a and b must have the same length");
	}

	let total = 0;
	let dropped = 0;

	for (let index = 0; index < a.length; index++) {
		const left = a[index]!;
		const right = b[index]!;
		const product = left * right;
		const next = total + product;

		dropped +=
			twoProductError(left, right, product) + twoSumError(total, product, next);
		total = next;
	}

	// A term that overflowed or was already non-finite leaves nothing to recover.
	return Number.isFinite(total) ? total + dropped : total;
}
