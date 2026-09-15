import { decimalFromString } from "./decimal/decimal-from-string.js";
import { decimalToFixed } from "./decimal/decimal-to-fixed.js";
import { decimalToPrecision } from "./decimal/decimal-to-precision.js";
import { refillLocaleSkeleton } from "./refill-locale-skeleton.js";
import { resolveLocaleSkeleton } from "./resolve-locale-skeleton.js";
import { roundingModeFromIntl } from "./rounding-mode-from-intl.js";

/** The widest digit counts `Intl.NumberFormat` will accept at construction. */
const MAX_INTL_FRACTION_DIGITS_ = 100;
const MAX_INTL_SIGNIFICANT_DIGITS_ = 21;

/**
 * Renders a decimal numeral for a human, by `Intl.NumberFormat`.
 *
 * The seam every `INum.format` goes through, so there is one place that talks
 * to `Intl` rather than one per numeric type. A numeral arrives as a string
 * deliberately: `Intl.NumberFormat.prototype.format` accepts one and reads it
 * at full precision, whereas routing a `Decimal` or a binary128 through a
 * `number` first would cap it at ~15 significant digits.
 *
 * `locales` and `options` are `new Intl.NumberFormat(locales, options)`'s own,
 * unchanged and uninterpreted — including the default, which is the ambient
 * locale. A caller who needs a machine-neutral rendering must ask for one
 * explicitly (`"en-US"` with `useGrouping: false`).
 *
 * **Beyond what `Intl` accepts.** `Intl` refuses `maximumFractionDigits` above
 * 100 and `maximumSignificantDigits` above 21, because that is all a binary64
 * can justify — so a request for 150 places throws at construction rather than
 * rounding. An arbitrary-precision value can carry them, so such a request is
 * honoured here instead: the numeral is rounded with this package's own decimal
 * arithmetic, and the locale's separators, grouping sizes and digit set are
 * recovered from `formatToParts` probes to re-emit it. The result is what
 * `Intl` would give if it had no ceiling.
 *
 * Two option shapes cannot be rendered that way, and asking for more digits
 * with either still throws: `notation: "compact"` and `unitDisplay` of `"long"`
 * or `"narrow"` pick a CLDR pattern by magnitude and plural category, so no
 * probe of a different magnitude predicts them. Neither is coherent for a value
 * long enough to need this path.
 *
 * Constructing the formatter dominates the cost, so a caller rendering many
 * values should build one `Intl.NumberFormat` itself and feed it each value's
 * `toString()`.
 *
 * @param numeral The value as a decimal numeral, or `"NaN"`/`"Infinity"`/
 *   `"-Infinity"`, all of which `Intl` accepts.
 * @param locales Passed straight to `Intl.NumberFormat`.
 * @param options Passed straight to `Intl.NumberFormat`, and allowed to ask for
 *   more digits than `Intl` itself would take.
 * @returns The localized rendering.
 */
export function formatNumeral(
	numeral: number | bigint | Intl.StringNumericLiteral,
	locales?: Intl.LocalesArgument,
	options?: Intl.NumberFormatOptions,
): string {
	const fraction = options?.maximumFractionDigits;
	const significant = options?.maximumSignificantDigits;
	const beyondFraction =
		fraction !== undefined && fraction > MAX_INTL_FRACTION_DIGITS_;
	const beyondSignificant =
		significant !== undefined && significant > MAX_INTL_SIGNIFICANT_DIGITS_;

	if (!beyondFraction && !beyondSignificant) {
		return new Intl.NumberFormat(locales, options).format(numeral);
	}

	const probe = new Intl.NumberFormat(locales, {
		...options,
		maximumFractionDigits: beyondFraction
			? MAX_INTL_FRACTION_DIGITS_
			: fraction,
		...(significant === undefined
			? {}
			: {
					maximumSignificantDigits: beyondSignificant
						? MAX_INTL_SIGNIFICANT_DIGITS_
						: significant,
					minimumSignificantDigits: undefined,
				}),
	});
	const roundingMode = roundingModeFromIntl(
		probe.resolvedOptions().roundingMode,
	);
	const value = decimalFromString(String(numeral));
	const rendered = beyondSignificant
		? decimalToPrecision(value, significant, roundingMode)
		: decimalToFixed(value, fraction ?? 0, roundingMode);

	return refillLocaleSkeleton(
		rendered,
		resolveLocaleSkeleton(probe),
		probe.formatToParts(-1).find((part) => part.type === "minusSign")?.value ??
			"-",
	);
}
