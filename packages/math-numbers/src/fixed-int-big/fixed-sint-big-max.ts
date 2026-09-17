/**
 * The largest value a `bitWidth`-bit two's-complement integer holds: `2 **
 * (bitWidth - 1) - 1`.
 *
 * A width of zero holds only `0n`, so it meets {@link fixedSIntBigMin} there
 * instead of sitting one below it. Widths outside the non-negative integers are
 * not part of the domain and are not rejected: unlike {@link fixedSIntBigFrom},
 * this admits no value and so has nothing to guard.
 *
 * @param bitWidth - Width of the integer, in bits.
 */
export function fixedSIntBigMax(bitWidth: number): bigint {
	// `1n << -1n` shifts right rather than throwing, and would answer `-1n`.
	if (bitWidth === 0) {
		return 0n;
	}

	return (1n << BigInt(bitWidth - 1)) - 1n;
}
