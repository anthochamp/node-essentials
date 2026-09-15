import { bigIntAbs, bigIntPow10 } from "@ac-kit/core";

import { IntegralFractional } from "../integral-fractional.js";
import { decimalFractionalPrecision } from "./decimal-fractional-precision.js";
import { Decimal } from "./decimal-types.js";

/**
 * The positional view of a decimal — sign, integral part and fractional digits
 * — where `{ coefficient, exponent }` is the scaled-integer view of the same
 * number. See `IntegralFractional` for which to reach for.
 *
 * @param value The decimal to decompose.
 * @returns The decomposition, exact.
 */
export function decimalIntegralFractional(
	value: Readonly<Decimal>,
): IntegralFractional {
	const { coefficient, exponent } = value;
	const sign: -1 | 1 = coefficient < 0n ? -1 : 1;
	const magnitude = bigIntAbs(coefficient);

	if (exponent >= 0) {
		return {
			s: sign,
			i: magnitude * bigIntPow10(exponent),
			f: 0n,
			fracDigits: 0,
		};
	}

	const scale = bigIntPow10(-exponent);

	return {
		s: sign,
		i: magnitude / scale,
		f: magnitude % scale,
		fracDigits: decimalFractionalPrecision(value),
	};
}
