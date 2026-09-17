/**
 * The most negative value a `bitWidth`-bit two's-complement integer holds: `-(2
 * ** (bitWidth - 1))`.
 *
 * Its magnitude is one larger than {@link fixedSIntBigMax} at every width but
 * zero, which is why negating or taking the absolute value of it overflows. A
 * width of zero holds only `0n`, so the two meet there. Widths outside the
 * non-negative integers are not part of the domain and are not rejected: unlike
 * {@link fixedSIntBigFrom}, this admits no value and so has nothing to guard.
 *
 * @param bitWidth - Width of the integer, in bits.
 */
export function fixedSIntBigMin(bitWidth: number): bigint {
	if (bitWidth === 0) {
		return 0n;
	}

	return -(1n << BigInt(bitWidth - 1));
}
