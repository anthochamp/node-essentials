import { IeeeFormat } from "../ieee-format.js";
import { toFormat } from "./_to-format.js";
import { IeeeBinary } from "./ieee-binary-types.js";

/**
 * `value` in canonical form for `format`: significand rounded to `p` bits with
 * its leading 1 at bit `p − 1`, exponent adjusted to match, and anything past
 * the format's range resolved to ±∞ or ±0.
 *
 * Every operation already returns a canonical value, so this is for values
 * assembled by hand — an `IeeeBinaryFinite` literal whose `sig` carries some
 * other number of bits denotes a real value, just not one this format stores.
 */
export function ieeeBinaryNormalize(
	value: IeeeBinary,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	return toFormat(value, format, format);
}
