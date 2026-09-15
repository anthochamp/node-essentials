/**
 * `base` raised to a non-negative integer `exponent`, by square-and-multiply.
 *
 * @throws {RangeError} When `exponent` is negative or not an integer.
 */
export function bigIntPow(base: bigint, exponent: number): bigint {
	if (!Number.isInteger(exponent) || exponent < 0) {
		throw new RangeError("Exponent must be a non-negative integer");
	}

	return base ** BigInt(exponent);
}
