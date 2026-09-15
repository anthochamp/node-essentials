import { DBL_MIN } from "../constants/float.js";

/**
 * Whether `value` is a subnormal binary64 — non-zero, but too small to carry a
 * full significand, so it has fewer significant bits than a normal number.
 */
export function isSubnormal(value: number): boolean {
	return value !== 0 && Math.abs(value) < DBL_MIN;
}
