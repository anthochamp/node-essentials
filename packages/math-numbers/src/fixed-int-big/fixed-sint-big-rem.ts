/**
 * Remainder of two `bitWidth`-bit two's-complement integers, truncated toward
 * zero — the sign follows the dividend, as C's `%` and `bigint`'s own do.
 *
 * Takes no overflow mode because it cannot overflow: the magnitude of a
 * remainder is strictly below the divisor's, so it always fits a type the
 * divisor already fits. It takes no `bitWidth` for the same reason — nothing
 * here depends on one. That also settles the pair C leaves undefined: the
 * minimum modulo `-1` is `0n`, not a trap.
 *
 * There is no unsigned counterpart: with two non-negative operands `%` has no
 * convention left to pin and cannot overflow either.
 *
 * @param left - Dividend.
 * @param right - Divisor.
 * @throws {RangeError} When `right` is zero.
 */
export function fixedSIntBigRem(left: bigint, right: bigint): bigint {
	if (right === 0n) {
		throw new RangeError("Division by zero");
	}

	return left % right;
}
