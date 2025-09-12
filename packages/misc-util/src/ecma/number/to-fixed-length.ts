import { clamp } from "../math/clamp.js";
import { type RoundingMethod, round } from "../math/round.js";
import { defaults } from "../object/defaults.js";

export type ToFixedLengthOptions = {
	/**
	 * Maximum number of fraction digits to include in the output.
	 * Default is `0`.
	 */
	maxFractionDigits?: number;

	/**
	 * Whether to always include the maximum number of fraction digits,
	 * even if it means adding trailing zeros. Default is `false`.
	 *
	 * If `false`, the function will try to reduce the number of fraction digits
	 * to fit the specified length.
	 */
	fixedFractionDigits?: boolean;

	/**
	 * Rounding method to use when rounding the number.
	 * Default is `"round"`.
	 */
	roundingMethod?: RoundingMethod;
};

const TO_FIXED_LENGTH_DEFAULT_OPTIONS: Required<ToFixedLengthOptions> = {
	maxFractionDigits: 0,
	fixedFractionDigits: false,
	roundingMethod: "round",
};

/**
 * Format a number to a fixed length string, with options for maximum fraction digits,
 * fixed fraction digits, and rounding method. If the number exceeds the maximum value
 * that can be represented with the given length and fraction digits, it will be clamped
 * to that maximum value.
 *
 * Examples with fixedLength=5, fractionDigits=2, fixedFractionDigits=true :
 *      0.012 => 00.01 (rounded)
 *      0.123 => 00.12 (rounded)
 *      1.234 => 01.23 (rounded)
 *     12.345 => 12.35 (rounded)
 *    123.456 => 99.99 (max)
 *          ..
 * 123456.789 => 99.99 (max)
 *
 * Examples with fixedLength=5, fractionDigits=2, fixedFractionDigits=false :
 *      0.012 => 00.01 (rounded)
 *      0.123 => 00.12 (rounded)
 *      1.234 => 01.23 (rounded)
 *     12.345 => 12.35 (rounded)
 *    123.456 => 123.5 (rounded)
 *   1234.567 => 999.9 (max)
 *  12345.678 => 12346 (rounded)
 * 123456.789 => 99999 (max)
 *
 * Examples with fixedLength=5, fractionDigits=3, fixedFractionDigits=false :
 *      0.012 => 0.012
 *      0.123 => 0.123
 *      1.234 => 1.234
 *     12.345 => 12.35 (rounded)
 *    123.456 => 123.5 (rounded)
 *   1234.567 => 999.9 (max)
 *  12345.678 => 12346 (rounded)
 * 123456.789 => 99999 (max)
 *
 * Examples with fixedLength=6, fractionDigits=2, fixedFractionDigits=false :
 *       0.012 => 000.01 (rounded)
 *       0.123 => 000.12 (rounded)
 *       1.234 => 001.23 (rounded)
 *      12.345 => 012.35 (rounded)
 *     123.456 => 123.46 (rounded)
 *    1234.567 => 1234.6 (rounded)
 *   12345.678 => 9999.9 (max)
 *  123456.789 => 123457 (rounded)
 * 1234567.891 => 999999 (max)
 *
 * @param value The number to format.
 * @param length The fixed length of the output string (including decimal point if any).
 * @param options Options for formatting.
 * @returns The formatted number as a string.
 */
export function toFixedLength(
	value: number,
	length: number,
	options?: ToFixedLengthOptions,
): string {
	let { fixedFractionDigits, maxFractionDigits, roundingMethod } = defaults(
		options,
		TO_FIXED_LENGTH_DEFAULT_OPTIONS,
	);

	if (maxFractionDigits < 0) {
		throw new Error("maxFractionDigits must be >= 0");
	}

	const effectiveLength = Math.abs(length) ?? maxFractionDigits;

	let maxValue: number;
	if (fixedFractionDigits) {
		// max value that can be represented with a dot
		maxValue =
			(10 ** (effectiveLength - (maxFractionDigits ? 1 : 0)) - 1) *
			10 ** -maxFractionDigits;
	} else {
		// max value that can be represented without a dot
		maxValue = 10 ** effectiveLength - 1;
	}

	value = round(clamp(value, -maxValue, maxValue), {
		fractionDigits: maxFractionDigits,
		roundingMethod,
	});

	if (!fixedFractionDigits) {
		// try to reduce fraction digits to fit the length
		while (
			maxFractionDigits > 0 &&
			value.toFixed(maxFractionDigits).length > effectiveLength
		) {
			maxFractionDigits--;

			value = round(value, {
				fractionDigits: maxFractionDigits,
				roundingMethod,
			});
		}

		// if no fraction digits left, but still not fitting the length, increase
		// fraction digits to have at least one decimal
		if (
			maxFractionDigits === 0 &&
			value.toFixed(maxFractionDigits).length === effectiveLength - 1
		) {
			maxFractionDigits++;

			// 10^(effectiveLength - 1) - 1 gives us the max integer that can be
			// represented with the given length and 1 decimal
			// e.g. effectiveLength=5 => 9999.9
			//      effectiveLength=6 => 99999.9
			//      effectiveLength=7 => 999999.9
			// We then multiply by 10^-maxFractionDigits to get the correct decimal place
			// e.g. maxFractionDigits=1 => 10^-1 = 0.1
			//      maxFractionDigits=2 => 10^-2 = 0.01
			//      maxFractionDigits=3 => 10^-3 = 0.001
			// This ensures that we have at least one decimal place while still fitting
			// the length.
			value = (10 ** (effectiveLength - 1) - 1) * 10 ** -maxFractionDigits;
		}
	}

	return value.toFixed(maxFractionDigits).padStart(effectiveLength, "0");
}
