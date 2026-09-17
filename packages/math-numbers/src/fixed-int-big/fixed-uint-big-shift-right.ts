import { validateShiftCount } from "./_validate-shift-count.js";

/**
 * Right shift of a `bitWidth`-bit unsigned integer; zeros fill from the left.
 *
 * Arithmetic and logical right shift coincide here — an unsigned value has no
 * sign bit to propagate — so this is the only one, and unlike its signed
 * counterparts it needs no `bitWidth`: the input already carries every bit it
 * has. Takes no overflow mode either, since shifting right cannot leave the
 * range.
 *
 * @param value - The value to shift.
 * @param count - Bit positions to shift by; non-negative.
 * @throws {RangeError} When `count` is negative or not a safe integer.
 */
export function fixedUIntBigShiftRight(value: bigint, count: number): bigint {
	validateShiftCount(count);

	return value >> BigInt(count);
}
