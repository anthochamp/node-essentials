import { DBL_MIN } from "../constants/float.js";

/**
 * Whether `value` is a normal binary64 — finite, non-zero, and with a full
 * 53-bit significand.
 *
 * Zero, subnormals, infinities and `NaN` are all excluded.
 */
export function isNormal(value: number): boolean {
	return Number.isFinite(value) && Math.abs(value) >= DBL_MIN;
}
