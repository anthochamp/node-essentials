import type { OverflowMode } from "../overflow-mode.js";
import { fixedUIntBigFrom } from "./fixed-uint-big-from.js";

/**
 * Sum of two `bitWidth`-bit unsigned integers, under `mode`.
 *
 * @param left - Left operand.
 * @param right - Right operand.
 * @param bitWidth - Width of the integer, in bits.
 * @param mode - Overflow policy. Defaults to
 *   `numericConfig.defaultOverflowMode`.
 * @throws {RangeError} When `bitWidth` is not a non-negative safe integer.
 * @throws {OverflowError} When the sum does not fit and `mode` is `abort`.
 */
export function fixedUIntBigAdd(
	left: bigint,
	right: bigint,
	bitWidth: number,
	mode?: OverflowMode,
): bigint {
	return fixedUIntBigFrom(left + right, bitWidth, mode);
}
