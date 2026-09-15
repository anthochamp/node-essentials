import { bigIntDivTrunc } from "./div-trunc.js";

/**
 * Flooring division — rounds toward negative infinity.
 *
 * `bigIntDivFloor(-7n, 2n) === -4n`, where {@link bigIntDivTrunc} gives `-3n`.
 *
 * @throws {RangeError} When `divisor` is zero.
 */
export function bigIntDivFloor(dividend: bigint, divisor: bigint): bigint {
	const quotient = bigIntDivTrunc(dividend, divisor);
	const remainder = dividend % divisor;

	if (remainder !== 0n && remainder < 0n !== divisor < 0n) {
		return quotient - 1n;
	}

	return quotient;
}
