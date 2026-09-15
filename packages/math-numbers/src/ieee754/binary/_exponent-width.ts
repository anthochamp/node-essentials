import { IeeeFormat } from "../ieee-format.js";

/**
 * Biased-exponent field width in bits: `w = k − p`.
 *
 * Derivation: `k = 1 (sign) + w (exponent) + t (trailing significand)` and `t =
 * p − 1`, therefore `w = k − p`.
 */
export function exponentWidth(format: IeeeFormat): number {
	return format.k - format.p;
}
