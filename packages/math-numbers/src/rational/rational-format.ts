import { formatNumeral } from "../format-numeral.js";
import { rationalAbs } from "./rational-abs.js";
import { rationalIntegralFractional } from "./rational-integral-fractional.js";
import { rationalToDecimalString } from "./rational-to-decimal-string.js";
import { Rational } from "./rational-types.js";

/** `Intl`'s own default when neither digit cap is resolved. */
const DEFAULT_FRACTION_DIGITS_ = 3;

/**
 * A rational rendered for a human, by `Intl.NumberFormat`.
 *
 * `Intl` has no ratio notation, so this is the decimal expansion rather than
 * `rationalToString`'s `p/q` — which for a non-terminating fraction means a
 * rounded one, as it must be.
 *
 * The expansion is taken to as many places as the resolved options can consume,
 * plus two guard digits, and `rationalToDecimalString`'s sticky last digit
 * carries "there is more below" into `Intl`'s own rounding. That is what stops
 * the two roundings from disagreeing: without it a truncation landing on a tie
 * would break the wrong way.
 *
 * @param value The rational to render.
 * @param locales Passed straight to `Intl.NumberFormat`.
 * @param options Passed straight to `Intl.NumberFormat`.
 * @returns The localized rendering.
 */
export function rationalFormat(
	value: Readonly<Rational>,
	locales?: Intl.LocalesArgument,
	options?: Intl.NumberFormatOptions,
): string {
	if (value.denominator === 1n) {
		return formatNumeral(value.numerator, locales, options);
	}

	const resolved = new Intl.NumberFormat(locales, options).resolvedOptions();
	const { integral } = rationalIntegralFractional(rationalAbs(value));
	const wanted =
		(resolved.maximumSignificantDigits ??
			resolved.maximumFractionDigits ??
			DEFAULT_FRACTION_DIGITS_) + integral.toString().length;

	return formatNumeral(
		rationalToDecimalString(value, wanted + 2) as Intl.StringNumericLiteral,
		locales,
		options,
	);
}
