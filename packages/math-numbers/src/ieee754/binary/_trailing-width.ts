import { IeeeFormat } from "../ieee-format.js";

/**
 * Trailing significand field width in bits: `t = p − 1`. (The leading 1 bit of
 * a normal number is implicit and not stored.)
 */
export function trailingWidth(format: IeeeFormat): number {
	return format.p - 1;
}
