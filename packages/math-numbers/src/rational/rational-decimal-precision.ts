import {
	integralFractionalFromString,
	integralFractionalPrecision,
} from "../integral-fractional.js";
import { rationalFractionalPrecision } from "./rational-fractional-precision.js";
import { rationalToDecimalString } from "./rational-to-decimal-string.js";
import { Rational } from "./rational-types.js";

/**
 * Significant digits of the exact decimal expansion, or `Infinity` when it does
 * not terminate. `1/4` is `0.25` and answers `2`; `1/3` answers `Infinity`.
 *
 * @param value The rational to measure.
 * @returns The significant-digit count, or `Infinity`.
 */
export function rationalDecimalPrecision(value: Readonly<Rational>): number {
	const places = rationalFractionalPrecision(value);

	if (places === Number.POSITIVE_INFINITY) {
		return Number.POSITIVE_INFINITY;
	}

	return integralFractionalPrecision(
		integralFractionalFromString(rationalToDecimalString(value, places)),
	);
}
