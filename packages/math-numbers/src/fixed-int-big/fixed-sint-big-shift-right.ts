import { validateShiftCount } from "./_validate-shift-count.js";

/**
 * Arithmetic right shift of a `bitWidth`-bit two's-complement integer: the sign
 * bit fills from the left, so a negative value shifts toward `-1n` and a
 * non-negative one toward `0n`.
 *
 * Takes no overflow mode and no `bitWidth` because neither applies: shifting
 * right only ever brings a value closer to zero or to `-1n`, both of which fit
 * any width the input fit. A count at or beyond the width is well defined and
 * saturating rather than undefined as it is in C.
 *
 * @param value - The value to shift.
 * @param count - Bit positions to shift by; non-negative.
 * @throws {RangeError} When `count` is negative or not a safe integer.
 */
export function fixedSIntBigShiftRight(value: bigint, count: number): bigint {
	validateShiftCount(count);

	return value >> BigInt(count);
}
