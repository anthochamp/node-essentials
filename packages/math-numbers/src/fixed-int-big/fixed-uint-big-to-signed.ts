import { validateBitWidth } from "./_validate-bit-width.js";

/**
 * The same bit pattern read as a two's-complement integer: `255n` at 8 bits
 * becomes `-1n`, and anything below half the range is returned unchanged.
 *
 * The inverse of {@link fixedSIntBigToUnsigned}, and a reinterpretation just as
 * it is — the bits do not move.
 *
 * @param value - A `bitWidth`-bit unsigned value.
 * @param bitWidth - Width of the integer, in bits.
 * @throws {RangeError} When `bitWidth` is not a non-negative safe integer.
 */
export function fixedUIntBigToSigned(value: bigint, bitWidth: number): bigint {
	validateBitWidth(bitWidth);

	return BigInt.asIntN(bitWidth, value);
}
