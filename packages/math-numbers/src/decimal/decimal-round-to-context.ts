import { bigIntPow10 } from "@ac-kit/core";

import { numericConfig } from "../globals.js";
import { decimalNormalize } from "./_normalize.js";
import { decimalRound } from "./_round.js";
import { Decimal, DecimalContext } from "./decimal-types.js";

/**
 * Rounds to at most `context.precision` significant digits.
 *
 * A precision of zero or less means unlimited, and the value is returned
 * unchanged.
 */
export function decimalRoundToContext(
	value: Readonly<Decimal>,
	context: Readonly<DecimalContext> = numericConfig.defaultDecimalContext,
): Decimal {
	const { precision, roundingMode } = context;

	if (precision <= 0 || value.precision <= precision) {
		return value;
	}

	const excess = value.precision - precision;
	const divisor = bigIntPow10(excess);
	const quotient = value.coefficient / divisor;
	const remainder = value.coefficient % divisor;

	return decimalNormalize(
		decimalRound(quotient, remainder, divisor, roundingMode),
		value.exponent + excess,
	);
}
