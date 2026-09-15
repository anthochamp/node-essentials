import { bigIntBitLength, bigIntPow } from "@ac-kit/core";

import type { Decimal } from "../../decimal/decimal-types.js";
import { IeeeFormat } from "../ieee-format.js";
import { finiteOrSpecial } from "./_finite-or-special.js";
import { normalizeSignificand } from "./_normalize.js";
import { IeeeBinary } from "./ieee-binary-types.js";

/**
 * The value of `decimal` in `format`, correctly rounded.
 *
 * Going through a JS `number` first would cap the result at binary64 whatever
 * the target format, so `1.0000000000000000000001` would land on exactly `1` in
 * binary128. This scales the coefficient in integer arithmetic instead and
 * hands the division remainder to the rounder as a sticky bit, so the result is
 * the same one a correctly-rounded decimal-to-binary conversion gives.
 *
 * Time complexity: O(M(d)) for a `d`-digit coefficient, dominated by the bigint
 * multiply and divide.
 *
 * @returns ±0 for a zero coefficient, ±∞ past the format's range.
 */
export function ieeeBinaryFromDecimal(
	decimal: Decimal,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	const { coefficient, exponent } = decimal;
	const sign = coefficient < 0n ? 1 : 0;
	const magnitude = coefficient < 0n ? -coefficient : coefficient;

	if (magnitude === 0n) {
		return { kind: "zero", sign };
	}

	// 10^e = 5^e · 2^e, so a non-negative exponent stays exact in integers.
	if (exponent >= 0) {
		const { sig, exp } = normalizeSignificand(
			magnitude * bigIntPow(5n, exponent),
			exponent,
			format,
		);
		return finiteOrSpecial(sig, exp, sign, format);
	}

	// A negative exponent divides by 5^m, which is inexact. Scale up first so the
	// quotient carries more bits than the format keeps, then let the remainder
	// decide the round — one rounding, not two.
	const divisor = bigIntPow(5n, -exponent);
	const shift = Math.max(
		0,
		format.p + 2 - (bigIntBitLength(magnitude) - bigIntBitLength(divisor)),
	);
	const scaled = magnitude << BigInt(shift);

	const { sig, exp } = normalizeSignificand(
		scaled / divisor,
		exponent - shift,
		format,
		scaled % divisor !== 0n,
	);
	return finiteOrSpecial(sig, exp, sign, format);
}
