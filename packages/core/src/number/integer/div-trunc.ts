/**
 * Truncating division — rounds toward zero, as `Math.trunc(a / b)` does.
 *
 * Computed from the remainder rather than by truncating a float quotient, so
 * the result is the exact integer whenever both operands are safe integers.
 *
 * `divTrunc(-7, 2) === -3`.
 *
 * @throws {RangeError} When `divisor` is zero.
 */
export function divTrunc(dividend: number, divisor: number): number {
	if (divisor === 0) {
		throw new RangeError("Division by zero");
	}

	return (dividend - (dividend % divisor)) / divisor;
}
