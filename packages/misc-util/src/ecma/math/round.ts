import { defaults } from "../object/defaults.js";

/**
 * Supported rounding methods.
 */
export type RoundingMethod = "round" | "floor" | "ceil";

export type RoundOptions = {
	/**
	 * Rounding method to use.
	 */
	roundingMethod?: RoundingMethod;

	/**
	 * Number of digits to keep after the decimal point.
	 */
	fractionDigits?: number;
};

const ROUND_DEFAULT_OPTIONS: Required<RoundOptions> = {
	roundingMethod: "round",
	fractionDigits: 0,
};

/**
 * Rounds a number to a given number of fraction digits using the specified
 * rounding method.
 *
 * @param value The number to round.
 * @param options Rounding options.
 * @returns The rounded number.
 */
export function round(value: number, options?: RoundOptions): number {
	const effectiveOptions = defaults(options, ROUND_DEFAULT_OPTIONS);

	const factor = 10 ** effectiveOptions.fractionDigits;
	return Math[effectiveOptions.roundingMethod](value * factor) / factor;
}
