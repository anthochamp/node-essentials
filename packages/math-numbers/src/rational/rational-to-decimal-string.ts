import { bigIntAbs, bigIntPow10 } from "@ac-kit/core";

import { Rational } from "./rational-types.js";

/**
 * `p/q` written out with exactly `places` decimal places.
 *
 * Truncated rather than rounded, then made **sticky**: when the division leaves
 * a remainder the last digit is forced odd, so rounding this numeral to fewer
 * places lands where rounding the exact value would. Without that, a caller
 * that rounds afterwards rounds twice, and a truncation that happened to land
 * on a tie breaks the wrong way.
 *
 * The sticky digit is why this is not simply `decimalDiv` on the two parts: it
 * encodes "there is more below" in a form any later rounding respects.
 *
 * @param value The rational to expand. Its denominator is positive by
 *   invariant.
 * @param places Decimal places to emit.
 * @returns The numeral, with `places` digits after the point.
 * @throws {RangeError} If `places` is not a non-negative integer.
 */
export function rationalToDecimalString(
	value: Readonly<Rational>,
	places: number,
): string {
	if (!Number.isInteger(places) || places < 0) {
		throw new RangeError(
			`rationalToDecimalString: places must be a non-negative integer, got ${places}`,
		);
	}

	const { numerator, denominator } = value;
	const negative = numerator < 0n;
	const scaled = bigIntAbs(numerator) * bigIntPow10(places);
	let magnitude = scaled / denominator;

	if (scaled % denominator !== 0n) {
		magnitude |= 1n;
	}

	const digits = magnitude.toString().padStart(places + 1, "0");
	const sign = negative && magnitude !== 0n ? "-" : "";

	if (places === 0) {
		return sign + digits;
	}

	const point = digits.length - places;

	return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}
