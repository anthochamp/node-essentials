import type { OverflowMode } from "../overflow-mode.js";
import { fixedSIntBigFrom } from "./fixed-sint-big-from.js";

/**
 * Negation of a `bitWidth`-bit two's-complement integer, under `mode`.
 *
 * Overflows for exactly one input: the minimum has no positive counterpart, so
 * `wrap` returns it unchanged, `clamp` returns the maximum, and `abort`
 * throws.
 *
 * @param value - The value to negate.
 * @param bitWidth - Width of the integer, in bits.
 * @param mode - Overflow policy. Defaults to
 *   `numericConfig.defaultOverflowMode`.
 * @throws {RangeError} When `bitWidth` is not a non-negative safe integer.
 * @throws {OverflowError} When `value` is the minimum and `mode` is `abort`.
 */
export function fixedSIntBigNeg(
	value: bigint,
	bitWidth: number,
	mode?: OverflowMode,
): bigint {
	return fixedSIntBigFrom(-value, bitWidth, mode);
}
