import { modEuclid } from "./mod-euclid.js";

/**
 * Euclidean division — the quotient whose remainder is {@link modEuclid}, so `a
 * === divEuclid(a, b) * b + modEuclid(a, b)`.
 *
 * Agrees with {@link divFloor} for a positive divisor and rounds the other way
 * for a negative one: `divEuclid(7, -2) === -3`, `divFloor(7, -2) === -4`.
 *
 * @throws {RangeError} When `divisor` is zero.
 */
export function divEuclid(dividend: number, divisor: number): number {
	return (dividend - modEuclid(dividend, divisor)) / divisor;
}
