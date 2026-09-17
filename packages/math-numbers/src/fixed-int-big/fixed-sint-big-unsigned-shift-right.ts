import { validateShiftCount } from "./_validate-shift-count.js";
import { fixedSIntBigToUnsigned } from "./fixed-sint-big-to-unsigned.js";
import { fixedUIntBigToSigned } from "./fixed-uint-big-to-signed.js";

/**
 * Logical right shift of a `bitWidth`-bit two's-complement integer: zeros fill
 * from the left, so `-1n` at 8 bits shifted by one is `127n`, not `-1n`.
 *
 * This is the one right shift that needs `bitWidth`. "Fill with zeros from the
 * left" presupposes a leftmost bit, and a `bigint` has none — a negative one
 * behaves as an infinite run of sign bits. The width is what makes the top bit
 * exist, so the value is read as a pattern, shifted, and read back.
 *
 * @param value - The value to shift.
 * @param count - Bit positions to shift by; non-negative.
 * @param bitWidth - Width of the integer, in bits.
 * @throws {RangeError} When `count` is negative or not a safe integer, or
 *   `bitWidth` is not a non-negative safe integer.
 */
export function fixedSIntBigUnsignedShiftRight(
	value: bigint,
	count: number,
	bitWidth: number,
): bigint {
	validateShiftCount(count);

	const pattern = fixedSIntBigToUnsigned(value, bitWidth) >> BigInt(count);

	return fixedUIntBigToSigned(pattern, bitWidth);
}
