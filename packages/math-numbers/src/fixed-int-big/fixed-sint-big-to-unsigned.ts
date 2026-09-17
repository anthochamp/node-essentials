import { validateBitWidth } from "./_validate-bit-width.js";

/**
 * The same bit pattern read as an unsigned integer: `-1n` at 8 bits becomes
 * `255n`, and a non-negative value is returned unchanged.
 *
 * A reinterpretation, not a conversion — the bits do not move. This is what the
 * operations that are defined on the pattern rather than on the number need: an
 * unsigned right shift has to fill from a real top bit, and a population count
 * has to have a finite number of bits to count.
 *
 * A `value` outside the signed range is truncated into it on the way, since
 * truncation is that wrap.
 *
 * @param value - A `bitWidth`-bit two's-complement value.
 * @param bitWidth - Width of the integer, in bits.
 * @throws {RangeError} When `bitWidth` is not a non-negative safe integer.
 */
export function fixedSIntBigToUnsigned(
	value: bigint,
	bitWidth: number,
): bigint {
	validateBitWidth(bitWidth);

	return BigInt.asUintN(bitWidth, value);
}
