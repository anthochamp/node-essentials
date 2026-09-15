import { bigIntAbs, bigIntPow10 } from "@ac-kit/core";

import { Decimal } from "./decimal-types.js";

/**
 * The decimal digit at `position`, counting powers of ten — `0` is the units
 * digit, `2` the hundreds, `-1` the tenths.
 *
 * `0` for any position the value does not reach, which makes a numeral's
 * leading and trailing zeros indistinguishable from absent ones, as they are.
 *
 * @param value The decimal to read.
 * @param position The power of ten to read.
 * @returns A digit from 0 to 9, ignoring the value's sign.
 * @throws {RangeError} If `position` is not an integer.
 */
export function decimalDigitAt(
	value: Readonly<Decimal>,
	position: number,
): number {
	if (!Number.isInteger(position)) {
		throw new RangeError(
			`decimalDigitAt: position must be an integer, got ${position}`,
		);
	}

	const { coefficient, exponent } = value;
	const shift = exponent - position;
	const magnitude = bigIntAbs(coefficient);
	const shifted =
		shift >= 0
			? magnitude * bigIntPow10(shift)
			: magnitude / bigIntPow10(-shift);

	return Number(shifted % 10n);
}
