import type { OverflowMode } from "../overflow-mode.js";
import { validateShiftCount } from "./_validate-shift-count.js";
import { fixedUIntBigFrom } from "./fixed-uint-big-from.js";

/**
 * Left shift of a `bitWidth`-bit unsigned integer, under `mode`.
 *
 * The shift happens at full `bigint` width and the policy applies to the exact
 * result, so a count at or beyond `bitWidth` is well defined rather than
 * undefined as it is in C: under `wrap` the answer is `0n`.
 *
 * @param value - The value to shift.
 * @param count - Bit positions to shift by; non-negative.
 * @param bitWidth - Width of the integer, in bits.
 * @param mode - Overflow policy. Defaults to
 *   `numericConfig.defaultOverflowMode`.
 * @throws {RangeError} When `count` is negative or not a safe integer, or
 *   `bitWidth` is not a non-negative safe integer.
 * @throws {OverflowError} When the result does not fit and `mode` is `abort`.
 */
export function fixedUIntBigShiftLeft(
	value: bigint,
	count: number,
	bitWidth: number,
	mode?: OverflowMode,
): bigint {
	validateShiftCount(count);

	return fixedUIntBigFrom(value << BigInt(count), bitWidth, mode);
}
