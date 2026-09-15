import { SQRT_TWO_PI } from "@ac-kit/math-scalar";

import { expSplit_ } from "./_exp-split.js";
import { LANCZOS_G_, lanczosSeries_ } from "./_lanczos.js";
import { gamma } from "./gamma.js";

/**
 * `B(a, b)` from the Lanczos form of all three gammas, with the terms regrouped
 * so nothing of order `ln Γ` is ever built.
 *
 * `Γ(a)Γ(b)/Γ(a+b)` collapses to
 * `√(2π)·e^(½−g)·(Aₐ·A_b/A_c)·(tₐ/t_c)^(a−½)·(t_b/t_c)^(b−½)·t_c^(−½)`, where
 * the `e^(−t)` factors cancel to the constant `e^(½−g)` exactly. The two
 * remaining powers are exponentiated separately, so each carries one ulp of its
 * own half-sized exponent rather than one ulp of their sum.
 *
 * Taken only past `a + b ≳ 171`, where the defining ratio has lost a gamma to
 * overflow; below that the ratio is both cheaper and more accurate. Closing the
 * residual `4e-14` at extreme shapes needs a double-double exponent, which
 * `@ac-kit/math-scalar` has planned but not built.
 */
function betaLanczos_(a: number, b: number): number {
	const shiftedSum = a + b + LANCZOS_G_ - 0.5;

	const lead =
		(SQRT_TWO_PI *
			Math.exp(0.5 - LANCZOS_G_) *
			lanczosSeries_(a - 1) *
			lanczosSeries_(b - 1)) /
		(lanczosSeries_(a + b - 1) * Math.sqrt(shiftedSum));

	// `tₐ/t_c = 1 − b/t_c` and `t_b/t_c = 1 − a/t_c`, since `t_c − tₐ = b`.
	const first = (a - 0.5) * Math.log1p(-b / shiftedSum);
	const second = (b - 0.5) * Math.log1p(-a / shiftedSum);

	return lead * expSplit_(first, second);
}

/**
 * The beta function `B(a, b) = Γ(a)Γ(b) / Γ(a + b)`.
 *
 * The ratio that normalizes a Beta distribution, and through it Student's _t_,
 * the _F_ distribution and the binomial. Written out by hand it overflows for
 * shapes far smaller than the ones whose ratio is still perfectly
 * representable, which is the whole reason it is a function rather than an
 * expression.
 *
 * `B` decays fast: it underflows to zero from around `a + b ≈ 1500`. Reach for
 * {@link logBeta} at that point, or any time you would immediately take a
 * logarithm of the result.
 *
 * Relative error is a few ulps while all three gammas are representable. Past
 * that it is bounded below by one ulp of each half-exponent — `B(500, 500)` has
 * a logarithm of `−695`, so no binary64 route gets nearer than about `4e-14`.
 *
 * O(1) time, O(1) memory.
 *
 * @example
 * 	```ts
 * 	beta(2, 3); // 0.08333333333333336 — 1/12
 * 	beta(0.5, 0.5); // 3.1415926535897905 — π
 * 	beta(500, 500); // 1.4799015991255068e-302
 * 	beta(2000, 2000); // 0 — underflowed; use logBeta
 * 	```;
 *
 * @param a First shape parameter, positive.
 * @param b Second shape parameter, positive.
 * @returns `B(a, b)`, or `NaN` when either parameter is non-positive, where the
 *   defining ratio has no real value.
 * @see {@link logBeta} for shapes whose `B` underflows.
 * @see [The gamma and beta functions](https://anthochamp.github.io/node-essentials/topics/math/functions/gamma/)
 */
export function beta(a: number, b: number): number {
	if (!(a > 0) || !(b > 0)) {
		return Number.NaN;
	}

	const product = gamma(a) * gamma(b);
	const total = gamma(a + b);

	if (Number.isFinite(product) && Number.isFinite(total) && total !== 0) {
		return product / total;
	}

	return betaLanczos_(a, b);
}
