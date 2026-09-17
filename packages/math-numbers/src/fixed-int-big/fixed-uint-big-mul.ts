import type { OverflowMode } from "../overflow-mode.js";
import { fixedUIntBigFrom } from "./fixed-uint-big-from.js";

/**
 * Product of two `bitWidth`-bit unsigned integers, under `mode`.
 *
 * The exact product is computed at full `bigint` width before the policy
 * applies, so `clamp` clamps against the true result rather than against one a
 * hardware multiply has already truncated.
 *
 * @param left - Left operand.
 * @param right - Right operand.
 * @param bitWidth - Width of the integer, in bits.
 * @param mode - Overflow policy. Defaults to
 *   `numericConfig.defaultOverflowMode`.
 * @throws {RangeError} When `bitWidth` is not a non-negative safe integer.
 * @throws {OverflowError} When the product does not fit and `mode` is `abort`.
 */
export function fixedUIntBigMul(
	left: bigint,
	right: bigint,
	bitWidth: number,
	mode?: OverflowMode,
): bigint {
	return fixedUIntBigFrom(left * right, bitWidth, mode);
}
