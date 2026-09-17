import { bigIntDivTrunc } from "@ac-kit/core";

import type { OverflowMode } from "../overflow-mode.js";
import { fixedSIntBigFrom } from "./fixed-sint-big-from.js";

/**
 * Quotient of two `bitWidth`-bit two's-complement integers, truncated toward
 * zero, under `mode`.
 *
 * Division overflows for exactly one pair — the minimum over `-1`, whose exact
 * quotient is one past the maximum. Division by zero is not overflow but an
 * undefined operation, so it throws `RangeError` whatever `mode` says.
 *
 * There is no unsigned counterpart: an unsigned quotient of two in-range values
 * is never larger than the dividend, so it cannot overflow and would be
 * `bigIntDivTrunc` under another name.
 *
 * @param left - Dividend.
 * @param right - Divisor.
 * @param bitWidth - Width of the integer, in bits.
 * @param mode - Overflow policy. Defaults to
 *   `numericConfig.defaultOverflowMode`.
 * @throws {RangeError} When `right` is zero, or `bitWidth` is not a
 *   non-negative safe integer.
 * @throws {OverflowError} When the quotient does not fit and `mode` is `abort`.
 */
export function fixedSIntBigDiv(
	left: bigint,
	right: bigint,
	bitWidth: number,
	mode?: OverflowMode,
): bigint {
	return fixedSIntBigFrom(bigIntDivTrunc(left, right), bitWidth, mode);
}
