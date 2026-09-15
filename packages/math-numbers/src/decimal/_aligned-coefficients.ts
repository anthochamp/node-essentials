import { bigIntPow10 } from "@ac-kit/core";

import { Decimal } from "./decimal-types.js";

export type DecimalAlignedCoefficients = [bigint, bigint, number];

/** Aligns two values on their smaller exponent, for addition and comparison. */
export function decimalAligned(
	a: Readonly<Decimal>,
	b: Readonly<Decimal>,
): DecimalAlignedCoefficients {
	const exponent = Math.min(a.exponent, b.exponent);

	return [
		a.exponent > exponent
			? a.coefficient * bigIntPow10(a.exponent - exponent)
			: a.coefficient,
		b.exponent > exponent
			? b.coefficient * bigIntPow10(b.exponent - exponent)
			: b.coefficient,
		exponent,
	];
}
