/**
 * Truncating division — rounds toward zero, as `bigint`'s own `/` does.
 *
 * `bigIntDivTrunc(-7n, 2n) === -3n`.
 *
 * @throws {RangeError} When `divisor` is zero.
 */
export function bigIntDivTrunc(dividend: bigint, divisor: bigint): bigint {
	if (divisor === 0n) {
		throw new RangeError("Division by zero");
	}

	return dividend / divisor;
}
