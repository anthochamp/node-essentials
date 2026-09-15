/**
 * `ln(1 + x) − x`, computed without the cancellation the literal expression
 * suffers.
 *
 * The two terms agree to leading order — `ln(1 + x) ≈ x − x²/2` — so
 * subtracting them directly loses every digit down to the `x²/2` that survives.
 * The error of the naive form is about `2ε/|x|`, which is 2e-14 by `x = 0.01`
 * and unbounded as `x → 0`.
 *
 * O(1) amortised: the alternating series is used only for `|x| ≤ 0.5`, where it
 * needs at most a few dozen terms, and the direct subtraction takes over above
 * that, where it is accurate because the terms no longer agree.
 *
 * @param x Any real greater than `-1`.
 * @returns `ln(1 + x) − x`, always non-positive.
 */
export function log1pmx_(x: number): number {
	if (Math.abs(x) > 0.5) {
		return Math.log1p(x) - x;
	}

	// −x²/2 + x³/3 − x⁴/4 + …, which has no cancellation to lose.
	let total = 0;
	let power = x * x;
	let sign = -1;

	for (let index = 2; index <= 80; index++) {
		const term = (sign * power) / index;
		total += term;

		if (Math.abs(term) <= Math.abs(total) * Number.EPSILON) {
			break;
		}

		power *= x;
		sign = -sign;
	}

	return total;
}
