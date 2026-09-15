import { bigIntAbs, bigIntPow10 } from "@ac-kit/core";

import { DEFAULT_ROUNDING_MODE, RoundingMode } from "../rounding-mode.js";
import { decimalRoundToPlace } from "./decimal-round-to-place.js";
import { Decimal } from "./decimal-types.js";

/**
 * Fixed-point notation with exactly `fractionDigits` places, padding with zeros
 * where the value has fewer — `Number.prototype.toFixed` for a decimal that is
 * not limited to binary64.
 *
 * `toFixed` caps its argument at 100 because that is all a binary64 can ever
 * justify. Nothing caps this one: an arbitrary-precision decimal can carry as
 * many places as it was built with, and refusing to print them would make the
 * ceiling of the representation the ceiling of the rendering.
 *
 * @param value The decimal to render.
 * @param fractionDigits Places to show. Defaults to `0`.
 * @param roundingMode How to break the last digit. Defaults to `half-even`.
 * @returns The numeral.
 * @throws {RangeError} If `fractionDigits` is not a non-negative integer.
 */
export function decimalToFixed(
	value: Readonly<Decimal>,
	fractionDigits = 0,
	roundingMode: RoundingMode = DEFAULT_ROUNDING_MODE,
): string {
	if (!Number.isInteger(fractionDigits) || fractionDigits < 0) {
		throw new RangeError(
			`decimalToFixed: fractionDigits must be a non-negative integer, got ${fractionDigits}`,
		);
	}

	const rounded = decimalRoundToPlace(value, fractionDigits, roundingMode);
	const shift = fractionDigits + rounded.exponent;
	const scaled =
		shift >= 0
			? rounded.coefficient * bigIntPow10(shift)
			: rounded.coefficient / bigIntPow10(-shift);
	const sign = scaled < 0n ? "-" : "";
	const digits = bigIntAbs(scaled)
		.toString()
		.padStart(fractionDigits + 1, "0");

	if (fractionDigits === 0) {
		return sign + digits;
	}

	const point = digits.length - fractionDigits;

	return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}
