import { bigIntAbs } from "@ac-kit/core";

import type { OverflowMode } from "../overflow-mode.js";
import { fixedSIntBigFrom } from "./fixed-sint-big-from.js";

/**
 * Absolute value of a `bitWidth`-bit two's-complement integer, under `mode`.
 *
 * Overflows for exactly one input, for the same reason {@link fixedSIntBigNeg}
 * does: the minimum's magnitude is one past the maximum.
 *
 * @param value - The value to take the magnitude of.
 * @param bitWidth - Width of the integer, in bits.
 * @param mode - Overflow policy. Defaults to
 *   `numericConfig.defaultOverflowMode`.
 * @throws {RangeError} When `bitWidth` is not a non-negative safe integer.
 * @throws {OverflowError} When `value` is the minimum and `mode` is `abort`.
 */
export function fixedSIntBigAbs(
	value: bigint,
	bitWidth: number,
	mode?: OverflowMode,
): bigint {
	return fixedSIntBigFrom(bigIntAbs(value), bitWidth, mode);
}
