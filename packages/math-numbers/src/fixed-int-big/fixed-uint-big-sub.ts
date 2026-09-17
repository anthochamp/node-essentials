import type { OverflowMode } from "../overflow-mode.js";
import { fixedUIntBigFrom } from "./fixed-uint-big-from.js";

/**
 * Difference of two `bitWidth`-bit unsigned integers, under `mode`.
 *
 * The asymmetric case: an unsigned difference overflows downward far more often
 * than upward, and `3n - 5n` is `wrap`'s all-but-two pattern, `clamp`'s `0n`,
 * or `abort`'s throw.
 *
 * @param left - Left operand.
 * @param right - Right operand.
 * @param bitWidth - Width of the integer, in bits.
 * @param mode - Overflow policy. Defaults to
 *   `numericConfig.defaultOverflowMode`.
 * @throws {RangeError} When `bitWidth` is not a non-negative safe integer.
 * @throws {OverflowError} When the difference is negative and `mode` is
 *   `abort`.
 */
export function fixedUIntBigSub(
	left: bigint,
	right: bigint,
	bitWidth: number,
	mode?: OverflowMode,
): bigint {
	return fixedUIntBigFrom(left - right, bitWidth, mode);
}
