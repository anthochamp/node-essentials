import { Decimal } from "./decimal-types.js";

/**
 * Decimal digits in the integral part of `|value|`, at least one — a value
 * below one still reads as the digit `0`.
 *
 * @param value The decimal to measure.
 * @returns The digit count.
 */
export function decimalIntegralPrecision(value: Readonly<Decimal>): number {
	const above = value.precision + value.exponent;

	return above > 0 ? above : 1;
}
