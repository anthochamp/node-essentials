import type { OverflowMode } from "../overflow-mode.js";
import { fixedUIntBigFrom } from "./fixed-uint-big-from.js";

/**
 * Negation of a `bitWidth`-bit unsigned integer, under `mode`.
 *
 * Every non-zero input overflows, since the unsigned range holds no negative
 * value. That is not a degenerate case but the useful one: under `wrap` this is
 * the two's-complement negation hardware performs, so `-x` is `2 ** bitWidth -
 * x` and negating twice returns the original.
 *
 * @param value - The value to negate. @param bitWidth - Width of the integer,
 * in bits. @param mode - Overflow policy. Defaults to
 * `numericConfig.defaultOverflowMode`. @throws {RangeError} When `bitWidth` is
 * not a non-negative safe integer. @throws {OverflowError} When `value` is
 * non-zero and `mode` is `abort`.
 */
export function fixedUIntBigNeg(
	value: bigint,
	bitWidth: number,
	mode?: OverflowMode,
): bigint {
	return fixedUIntBigFrom(-value, bitWidth, mode);
}
