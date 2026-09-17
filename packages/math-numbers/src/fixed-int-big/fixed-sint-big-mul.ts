import type { OverflowMode } from "../overflow-mode.js";
import { fixedSIntBigFrom } from "./fixed-sint-big-from.js";

/**
 * Product of two `bitWidth`-bit two's-complement integers, under `mode`.
 *
 * The exact product is computed at full `bigint` width before the policy
 * applies, so `clamp` clamps against the true result rather than against a
 * truncated one — unlike a hardware multiply, which has already lost the high
 * half by the time it can notice.
 *
 * @param left - Left operand.
 * @param right - Right operand.
 * @param bitWidth - Width of the integer, in bits.
 * @param mode - Overflow policy. Defaults to
 *   `numericConfig.defaultOverflowMode`.
 * @throws {RangeError} When `bitWidth` is not a non-negative safe integer.
 * @throws {OverflowError} When the product does not fit and `mode` is `abort`.
 */
export function fixedSIntBigMul(
	left: bigint,
	right: bigint,
	bitWidth: number,
	mode?: OverflowMode,
): bigint {
	return fixedSIntBigFrom(left * right, bitWidth, mode);
}
