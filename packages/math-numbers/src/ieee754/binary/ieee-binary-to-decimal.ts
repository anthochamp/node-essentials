import { bigIntPow } from "@ac-kit/core";
import { limb32ToBigInt } from "@ac-kit/math-integer";

import { decimalNormalize } from "../../decimal/_normalize.js";
import { Decimal } from "../../decimal/decimal-types.js";
import { IeeeFormat } from "../ieee-format.js";
import { IeeeBinaryFinite } from "./ieee-binary-types.js";

/**
 * The **exact** decimal value of a finite binary float, at any width.
 *
 * Always exact and always terminating: the value is `sig × 2^e`, and a negative
 * `e` divides by a power of two, which `1/2 = 5/10` turns into a finite decimal
 * — so no rounding is possible and none happens. Going through
 * `ieeeBinaryToNumber` instead would cap the answer at binary64 and throw away
 * everything a binary128 carries past ~15 digits.
 *
 * The result is the exact expansion, not the shortest numeral that round-trips:
 * binary64's `0.1` comes back as its full 55-digit value.
 *
 * @param value A finite value in the unpacked pseudo-normal form.
 * @param format The format `value` is expressed in, which fixes its precision.
 * @returns The same number as a canonical {@link Decimal}.
 */
export function ieeeBinaryToDecimal(
	value: IeeeBinaryFinite,
	format: IeeeFormat,
): Decimal {
	const magnitude =
		typeof value.sig === "bigint" ? value.sig : limb32ToBigInt(value.sig);
	const signed = value.sign === 1 ? -magnitude : magnitude;
	const exponent = value.exp - (format.p - 1);

	return exponent >= 0
		? decimalNormalize(signed << BigInt(exponent), 0)
		: decimalNormalize(signed * bigIntPow(5n, -exponent), exponent);
}
