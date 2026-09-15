import { bigIntBitLength } from "@ac-kit/core";

import { Rational } from "./rational-types.js";

/**
 * The nearest binary64 approximation.
 *
 * Dividing the two `Number` conversions loses the value entirely once either
 * part exceeds `Number.MAX_VALUE`, so wide operands are scaled down by their
 * common bit length first.
 */
export function rationalToNumber(value: Readonly<Rational>): number {
	const numerator = Number(value.numerator);
	const denominator = Number(value.denominator);

	if (Number.isFinite(numerator) && Number.isFinite(denominator)) {
		return numerator / denominator;
	}

	// One or both parts are past binary64's range. Dropping the same number of
	// low bits from each leaves the quotient unchanged to within an ulp, and
	// 1000 bits is the widest that still converts to a finite double.
	const negative = value.numerator < 0n;
	const magnitude = negative ? -value.numerator : value.numerator;
	const widest = Math.max(
		bigIntBitLength(magnitude),
		bigIntBitLength(value.denominator),
	);
	const shift = BigInt(Math.max(widest - 1000, 0));
	const quotient =
		Number(magnitude >> shift) / Number(value.denominator >> shift);

	return negative ? -quotient : quotient;
}
