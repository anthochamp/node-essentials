import { Decimal } from "./decimal-types.js";

/**
 * Decimal places in the exact expansion — `0` for an integral value.
 *
 * Always finite, unlike the rational answer: a decimal is a scaled integer, so
 * its expansion terminates by construction.
 *
 * @param value The decimal to measure.
 * @returns The place count.
 */
export function decimalFractionalPrecision(value: Readonly<Decimal>): number {
	return value.exponent < 0 ? -value.exponent : 0;
}
