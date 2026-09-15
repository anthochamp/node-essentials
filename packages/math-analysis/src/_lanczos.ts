/**
 * Lanczos parameter `g`, which is meaningless apart from the coefficient set
 * below — the two are fitted together and cannot be mixed with another pair.
 */
export const LANCZOS_G_ = 607 / 128;

/**
 * Coefficients of the Lanczos rational series for `g = 607/128`, `n = 15`.
 *
 * Chosen over the `g = 7`, `n = 9` set that circulates widely, because that
 * set's _fit_ error grows with the argument — measured against a 60-digit
 * reference it is 2e-16 at `z = 0` but 6.5e-14 at `z = 99` and 1.5e-13 at `z =
 * 499`, which became the error floor of every incomplete gamma and beta built
 * on it. This set holds under 2e-15 across the same range, and under 1.3e-18
 * for `z ≤ 19`.
 *
 * Written as the binary64 values the published decimals round to, rather than
 * the decimals themselves — the stored value is identical either way, and this
 * form does not read as though it carries digits it cannot.
 */
const LANCZOS_COEFFICIENTS_ = [
	0.9999999999999971, 57.15623566586292, -59.59796035547549, 14.136097974741746,
	-0.4919138160976202, 0.00003399464998481189, 0.00004652362892704858,
	-0.00009837447530487956, 0.0001580887032249125, -0.00021026444172410488,
	0.00021743961811521265, -0.0001643181065367639, 0.00008441822398385275,
	-0.000026190838401581408, 0.0000036899182659531625,
] as const;

/**
 * The Lanczos series `Aɡ(z)`, the slowly-varying factor both `gamma` and
 * `logGamma` multiply their Stirling-shaped leading term by.
 *
 * The coefficients alternate in sign, which looks like a case for compensated
 * summation. Measured: it is not. Neumaier compensation moves the series by a
 * few ulps and leaves Γ a wash — the error that dominates is the fit's, and no
 * better sum can reach it.
 *
 * O(1) — fifteen divisions, fixed by the coefficient set.
 *
 * @param z The shifted argument `x − 1`.
 * @returns `Aɡ(z)`.
 */
export function lanczosSeries_(z: number): number {
	let result = LANCZOS_COEFFICIENTS_[0];
	for (let index = 1; index < LANCZOS_COEFFICIENTS_.length; index++) {
		result += LANCZOS_COEFFICIENTS_[index]! / (z + index);
	}
	return result;
}
