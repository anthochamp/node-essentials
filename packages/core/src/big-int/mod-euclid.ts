import { bigIntAbs } from "./abs.js";

/**
 * Euclidean remainder — always in `[0, |divisor|)`, whatever the signs.
 *
 * Differs from {@link bigIntMod} only when `divisor` is negative, where the
 * floored remainder follows the divisor's sign and this one stays non-negative:
 * `bigIntMod(-7n, -2n)` is `-1n`, `bigIntModEuclid(-7n, -2n)` is `1n`.
 *
 * @throws {RangeError} When `divisor` is zero.
 */
export function bigIntModEuclid(dividend: bigint, divisor: bigint): bigint {
	if (divisor === 0n) {
		throw new RangeError("Division by zero");
	}

	const remainder = dividend % divisor;

	return remainder < 0n ? remainder + bigIntAbs(divisor) : remainder;
}
