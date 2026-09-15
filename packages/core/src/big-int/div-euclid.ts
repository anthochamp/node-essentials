import { bigIntModEuclid } from "./mod-euclid.js";

/**
 * Euclidean division — the quotient whose remainder is {@link bigIntModEuclid},
 * so `dividend === quotient * divisor + bigIntModEuclid(dividend, divisor)`.
 *
 * Derived from the remainder rather than by flooring, because flooring and
 * Euclidean division agree only when the divisor is positive.
 *
 * @throws {RangeError} When `divisor` is zero.
 */
export function bigIntDivEuclid(dividend: bigint, divisor: bigint): bigint {
	return (dividend - bigIntModEuclid(dividend, divisor)) / divisor;
}
