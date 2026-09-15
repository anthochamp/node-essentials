import { LN_TWO_PI } from "@ac-kit/math-scalar";

import { LANCZOS_G_, lanczosSeries_ } from "./_lanczos.js";

/**
 * The natural logarithm of the gamma function, `ln Γ(x)`.
 *
 * Use it whenever `Γ` itself would not fit. `Γ(a)` overflows binary64 past `a ≈
 * 171.6`, while `ln Γ(a)` stays finite for every argument a caller can
 * represent — which is what makes the ratios of gamma functions behind
 * {@link beta} and the probability distributions computable at all.
 *
 * Defined for `x > 0` only. That is not a gap: Γ alternates sign between
 * consecutive negative integers and has a pole at each of them, so no real
 * logarithm covers the negative reals. Use {@link gamma} there, which carries
 * the sign.
 *
 * O(1) time, O(1) memory — a fixed nine-term series.
 *
 * @example
 * 	```ts
 * 	logGamma(172); // 711.71472580229 — finite where gamma(172) is Infinity
 * 	logGamma(1e6); // 12815504.56914761
 * 	logGamma(-1); // NaN — no real logarithm on the negative reals
 * 	```;
 *
 * @param x A positive real.
 * @returns `ln Γ(x)`, or `NaN` when `x ≤ 0` or `x` is `NaN`.
 * @see {@link gamma} for the value itself, and for negative arguments.
 * @see [The gamma and beta functions](https://anthochamp.github.io/node-essentials/topics/math/functions/gamma/)
 */
export function logGamma(x: number): number {
	// Written as a positive test so NaN falls through to NaN rather than passing.
	if (!(x > 0)) {
		return Number.NaN;
	}

	const z = x - 1;
	const t = z + LANCZOS_G_ + 0.5;

	return (
		LN_TWO_PI / 2 + (z + 0.5) * Math.log(t) - t + Math.log(lanczosSeries_(z))
	);
}
