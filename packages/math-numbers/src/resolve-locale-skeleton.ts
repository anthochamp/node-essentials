/**
 * Everything about a locale's number rendering that `Intl` does not expose as
 * data, recovered from what it does expose: labelled parts.
 *
 * `Intl.NumberFormat` holds CLDR's separators, grouping sizes and digit set
 * internally and offers no accessor for them — `resolvedOptions` reports the
 * options it was given, not the data it resolved. `formatToParts` does label
 * every piece of its output, though, so formatting a probe value and reading
 * the labels back recovers the lot without a CLDR table of our own.
 *
 * This is only needed past `Intl`'s own limits of 100 fraction digits and 21
 * significant digits. Inside them `Intl.NumberFormat.prototype.format` is exact
 * and is used directly.
 */
export type LocaleNumberSkeleton = {
	/** The ten digits of the resolved numbering system, `0` through `9`. */
	readonly digits: readonly string[];
	/** Character between the integral and fractional parts. */
	readonly decimalSeparator: string;
	/** Character between digit groups, or `""` when the locale groups none. */
	readonly groupSeparator: string;
	/**
	 * Digits in the group nearest the point, then in every group above it. `[3,
	 * 3]` for most locales, `[3, 2]` for `en-IN`'s `12,34,567`.
	 */
	readonly groupSizes: readonly [number, number];
	/**
	 * Integral digits a value needs before grouping starts at all. `2` in `pl-PL`
	 * and `es-ES`, where `1000` is ungrouped but `10 000` is not.
	 */
	readonly minimumGroupingDigits: number;
	/** Text before the number, including any sign, currency symbol or spacing. */
	readonly prefix: string;
	/** Text after the number, including any percent sign, unit or spacing. */
	readonly suffix: string;
};

/** Long enough to expose both group sizes, and unmistakably fractional. */
const GROUPING_PROBE_ = "1234567890123.5";
const UNGROUPED_PROBE_ = "1000";
const DIGIT_PROBE_ = "1234567890";

/**
 * Learns everything about how `formatter` renders a number that is needed to
 * re-emit one by hand.
 *
 * Costs three `formatToParts` calls and one `format`, so a caller rendering
 * many values resolves it once and keeps it — which is what `formatNumeral`
 * does.
 *
 * The probe is magnitude-independent by construction: separators, grouping
 * sizes, digit set and the surrounding literals do not vary with the value. Two
 * things do, and neither survives this treatment — compact notation (`1.2M`)
 * and long or narrow unit names both select a CLDR pattern by magnitude and
 * plural category, so a small probe cannot predict a large value's output.
 *
 * @param formatter The formatter to interrogate.
 * @returns The recovered skeleton.
 */
export function resolveLocaleSkeleton(
	formatter: Intl.NumberFormat,
): LocaleNumberSkeleton {
	const parts = formatter.formatToParts(
		GROUPING_PROBE_ as Intl.StringNumericLiteral,
	);
	const integerRuns: string[] = [];
	let decimalSeparator = ".";
	let groupSeparator = "";
	let prefix = "";
	let suffix = "";
	let seenNumber = false;

	for (const part of parts) {
		switch (part.type) {
			case "integer":
				integerRuns.push(part.value);
				seenNumber = true;
				break;
			case "group":
				groupSeparator = part.value;
				break;
			case "decimal":
				decimalSeparator = part.value;
				break;
			case "fraction":
				seenNumber = true;
				break;
			default:
				// A minus sign belongs to the value, not to the surrounding text, and
				// the probe is positive, so anything here is literal decoration.
				if (seenNumber) {
					suffix += part.value;
				} else {
					prefix += part.value;
				}
		}
	}

	return {
		digits: resolveDigits_(formatter),
		decimalSeparator,
		groupSeparator,
		groupSizes: resolveGroupSizes_(integerRuns),
		minimumGroupingDigits: resolveMinimumGroupingDigits_(formatter),
		prefix,
		suffix,
	};
}

/**
 * The numbering system's ten digits, read off a probe rather than tabulated —
 * `deva` answers `१२३४५६७८९०`, `arab` `١٢٣٤٥٦٧٨٩٠`.
 */
function resolveDigits_(formatter: Intl.NumberFormat): readonly string[] {
	const plain = new Intl.NumberFormat(formatter.resolvedOptions().locale, {
		numberingSystem: formatter.resolvedOptions().numberingSystem,
		useGrouping: false,
		maximumFractionDigits: 0,
		style: "decimal",
	});
	// `adlm`'s digits sit above the BMP, so splitting by code point is required.
	// oxlint-disable-next-line no-misused-spread -- `split("")` would halve them.
	const nonZero = [...plain.format(DIGIT_PROBE_ as Intl.StringNumericLiteral)];

	// The probe runs 1…9 then 0, so the last character is the zero digit.
	return [nonZero[9]!, ...nonZero.slice(0, 9)];
}

/**
 * Group sizes read from the right, since the group nearest the point is the one
 * that may differ. A locale that groups nothing answers `[0, 0]`.
 */
function resolveGroupSizes_(
	integerRuns: readonly string[],
): readonly [number, number] {
	if (integerRuns.length < 2) {
		return [0, 0];
	}

	const primary = integerRuns[integerRuns.length - 1]!.length;
	const secondary = integerRuns[integerRuns.length - 2]!.length;

	return [primary, secondary];
}

/**
 * Whether a four-digit value groups. CLDR's `minimumGroupingDigits` is `2` in
 * the locales where it does not.
 */
function resolveMinimumGroupingDigits_(formatter: Intl.NumberFormat): number {
	const groupsFourDigits = formatter
		.formatToParts(UNGROUPED_PROBE_ as Intl.StringNumericLiteral)
		.some((part) => part.type === "group");

	return groupsFourDigits ? 1 : 2;
}
