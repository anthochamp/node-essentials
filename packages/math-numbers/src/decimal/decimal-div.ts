import { bigIntPow10 } from "@ac-kit/core";

import { numericConfig } from "../globals.js";
import { decimalNormalize } from "./_normalize.js";
import { decimalRound } from "./_round.js";
import { decimalRoundToContext } from "./decimal-round-to-context.js";
import { DECIMAL_ZERO, Decimal, DecimalContext } from "./decimal-types.js";

/** Extra digits carried through a division before the final rounding. */
const GUARD_DIGITS_ = 4;

/**
 * `a ÷ b`, rounded to the context's precision.
 *
 * Division rarely terminates, so the quotient is computed with
 * {@link GUARD_DIGITS_} extra digits and rounded once at the end. Rounding the
 * scaled quotient and then rounding again to the context would double-round.
 *
 * @throws {RangeError} When `b` is zero, or the context forbids rounding and
 *   rounding is required.
 */
export function decimalDiv(
	a: Readonly<Decimal>,
	b: Readonly<Decimal>,
	context: Readonly<DecimalContext> = numericConfig.defaultDecimalContext,
): Decimal {
	const { precision, roundingMode } = context;

	if (b.coefficient === 0n) {
		throw new RangeError("Division by zero");
	}

	if (a.coefficient === 0n) {
		return DECIMAL_ZERO;
	}

	const digits = precision > 0 ? precision : a.precision + b.precision;

	// Dividing an m-digit coefficient by an n-digit one yields about m − n + 1
	// digits, so the dividend has to be scaled by the shortfall as well as by
	// the digits being asked for. Scaling by the precision alone silently
	// returns fewer digits than requested whenever the divisor is the wider of
	// the two — which is exactly what happens inside a Newton iteration.
	const scale = Math.max(digits + GUARD_DIGITS_ + b.precision - a.precision, 0);
	const scaled = a.coefficient * bigIntPow10(scale);
	const rounded = decimalRound(
		scaled / b.coefficient,
		scaled % b.coefficient,
		b.coefficient,
		roundingMode,
	);

	const target =
		digits === precision
			? { roundingMode, precision }
			: { roundingMode, precision: digits };

	return decimalRoundToContext(
		decimalNormalize(rounded, a.exponent - b.exponent - scale),
		target,
	);
}
