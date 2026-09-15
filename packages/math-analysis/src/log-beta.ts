import { beta } from "./beta.js";
import { logGamma } from "./log-gamma.js";

/**
 * The natural logarithm of the beta function, `ln B(a, b)`.
 *
 * The form to use once the shapes get large: `B(a, b)` underflows to zero from
 * around `a + b ≈ 1500`, and this keeps full relative precision well past that.
 * It is also what you want any time the result was going to be logged, summed
 * with other logs, or exponentiated at the end — which is most of what a
 * likelihood calculation does.
 *
 * Not a wrapper around `Math.log(beta(a, b))`: below the underflow point that
 * is exactly what it computes, because the log of an accurate value carries
 * only its own rounding, and above it a sum of three log-gammas takes over.
 *
 * O(1) time, O(1) memory.
 *
 * @example
 * 	```ts
 * 	logBeta(500, 500); // -694.9887224857135
 * 	logBeta(2000, 2000); // -2775.1235988460758 — where beta() returns 0
 * 	```;
 *
 * @param a First shape parameter, positive.
 * @param b Second shape parameter, positive.
 * @returns `ln B(a, b)`, or `NaN` when either parameter is non-positive.
 * @see {@link beta} for the value itself.
 * @see [The gamma and beta functions](https://anthochamp.github.io/node-essentials/topics/math/functions/gamma/)
 */
export function logBeta(a: number, b: number): number {
	const value = beta(a, b);

	return value > 0 && Number.isFinite(value)
		? Math.log(value)
		: logGamma(a) + logGamma(b) - logGamma(a + b);
}
