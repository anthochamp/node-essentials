import { SQRT_TWO_PI } from "@ac-kit/math-scalar";

import { expSplit_ } from "./_exp-split.js";
import { LANCZOS_G_, lanczosSeries_ } from "./_lanczos.js";

/**
 * The factor `xᵃ(1 − x)ᵇ / B(a, b)` scaling the continued fraction.
 *
 * Substituting the Lanczos form of every gamma in `B(a, b)` regroups the
 * exponent into `a·ln(x·t_c/t_a) + b·ln(y·t_c/t_b)`, whose two bases sit near 1
 * wherever `x` is near `a/(a + b)` — the region the fraction is used in. The
 * literal `a·ln x + b·ln y − ln B(a, b)` instead builds three terms of order 45
 * at `a = 30, b = 40` and cancels them down to 2, spending the digits that
 * cancellation costs.
 *
 * The two pieces are exponentiated separately and multiplied, never added, so
 * the sum's last bit never becomes the answer's error.
 *
 * @param a First shape parameter, positive.
 * @param b Second shape parameter, positive.
 * @param x Point of evaluation, in `(0, 1)`.
 * @param y `1 − x`, passed in because the caller already holds an accurate one.
 * @returns `xᵃ(1 − x)ᵇ / B(a, b)`.
 */
export function betaPowerTerms_(
	a: number,
	b: number,
	x: number,
	y: number,
): number {
	const shiftedA = a + LANCZOS_G_ - 0.5;
	const shiftedB = b + LANCZOS_G_ - 0.5;
	const shiftedSum = a + b + LANCZOS_G_ - 0.5;

	const lead =
		(Math.sqrt((shiftedA * shiftedB) / shiftedSum) *
			Math.exp(LANCZOS_G_ - 0.5) *
			lanczosSeries_(a + b - 1)) /
		(SQRT_TWO_PI * lanczosSeries_(a - 1) * lanczosSeries_(b - 1));

	// `x·t_c/tₐ − 1` and `y·t_c/t_b − 1`, formed without the subtraction of
	// near-equal numbers that the ratios themselves would need. Where a ratio
	// falls well below 1 the delta sits next to −1, and `log1p` would have to
	// rebuild the ratio from it; the ratio is taken directly there instead.
	const ratioA = (x * shiftedSum) / shiftedA;
	const ratioB = (y * shiftedSum) / shiftedB;
	const deltaA = (x * b - y * shiftedA) / shiftedA;
	const deltaB = (y * a - x * shiftedB) / shiftedB;

	const first = a * (ratioA > 0.5 ? Math.log1p(deltaA) : Math.log(ratioA));
	const second = b * (ratioB > 0.5 ? Math.log1p(deltaB) : Math.log(ratioB));

	return lead * expSplit_(first, second);
}
