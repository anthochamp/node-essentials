import { SQRT_TWO_PI } from "@ac-kit/math-scalar";

import { LANCZOS_G_, lanczosSeries_ } from "./_lanczos.js";

/**
 * The gamma function `Γ(x)` — the factorial, extended to every real number.
 *
 * `Γ(n) = (n − 1)!` at each positive integer, and it joins those points with a
 * smooth curve, so a formula that "should" contain a factorial can be handed
 * 2.5 as readily as 3. That is why it turns up in the normalizing constant of
 * almost every continuous probability distribution.
 *
 * Reach for {@link logGamma} the moment the result might not fit: `Γ` passes the
 * top of binary64 at about `x = 171.6`. Reach for {@link beta} rather than
 * writing `gamma(a) * gamma(b) / gamma(a + b)` yourself, which overflows long
 * before the ratio it computes would.
 *
 * Relative error is within about six ulps for ordinary arguments and stays
 * under `5e-13` at the extremes of the representable range.
 *
 * O(1) time, O(1) memory — a fixed nine-term series, plus at most one
 * reflection step for arguments below `0.5`.
 *
 * @example
 * 	```ts
 * 	gamma(5); // 23.999999999999986 — 4!, to within four ulps
 * 	gamma(0.5); // 1.7724538509055152 — √π
 * 	gamma(-1); // NaN — a pole
 * 	gamma(172); // Infinity — past the binary64 range
 * 	```;
 *
 * @param x Any real other than a non-positive integer.
 * @returns `Γ(x)`; `±Infinity` where the true value exceeds binary64, and `NaN`
 *   at the non-positive integers, where Γ has a pole whose one-sided limits
 *   disagree in sign.
 * @see {@link logGamma} for arguments whose Γ overflows.
 * @see [The gamma and beta functions](https://anthochamp.github.io/node-essentials/topics/math/functions/gamma/)
 */
export function gamma(x: number): number {
	if (x < 0.5) {
		if (Number.isInteger(x)) {
			return Number.NaN;
		}

		// Euler's reflection formula, which trades an argument Lanczos cannot
		// serve for one it can.
		return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
	}

	// Evaluated as a product rather than as `exp(logGamma(x))`, which is the less
	// accurate of the two because taking the log and undoing it magnifies its
	// rounding by `ln Γ(x)`. Measured against the exact factorials: the product is
	// 4 ulps low at `x = 5` and exact at `x = 10`, where the exponentiated log is
	// 11 low and 19 high respectively.
	const z = x - 1;
	const t = z + LANCZOS_G_ + 0.5;

	// Splitting the power in half keeps the intermediate inside binary64 for
	// arguments whose Γ is itself still finite; `t ** (z + 0.5)` alone overflows
	// from about `x = 142` while Γ does not until `x ≈ 171.6`.
	const halfPower = t ** ((z + 0.5) / 2);

	return (
		SQRT_TWO_PI * lanczosSeries_(z) * halfPower * (Math.exp(-t) * halfPower)
	);
}
