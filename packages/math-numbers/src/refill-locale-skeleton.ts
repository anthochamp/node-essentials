import { LocaleNumberSkeleton } from "./resolve-locale-skeleton.js";

/**
 * Re-emits an exact decimal numeral through a locale's own skeleton, for the
 * values `Intl.NumberFormat` refuses to render in full.
 *
 * `Intl` caps a rendering at 100 fraction digits and 21 significant digits, so
 * a `Decimal` or a wide binary float longer than that comes back rounded. This
 * takes the numeral as given, maps its digits into the locale's numbering
 * system, inserts group separators at the sizes the skeleton reports, and
 * splices the result between the skeleton's prefix and suffix — so the output
 * matches what `Intl` would produce if it had no cap.
 *
 * Nothing is rounded here. The caller has already decided how many digits to
 * show; this only renders them.
 *
 * O(n) in the digit count.
 *
 * @param numeral A plain decimal numeral: optional `-`, digits, optional `.`
 *   and more digits. No exponent, and no separators.
 * @param skeleton The locale's rendering, from `resolveLocaleSkeleton`.
 * @param minusSign The locale's minus sign, which `Intl` reports per value.
 * @returns The localized rendering.
 */
export function refillLocaleSkeleton(
	numeral: string,
	skeleton: LocaleNumberSkeleton,
	minusSign: string,
): string {
	const negative = numeral.startsWith("-");
	const unsigned = negative ? numeral.slice(1) : numeral;
	const point = unsigned.indexOf(".");
	const integral = point === -1 ? unsigned : unsigned.slice(0, point);
	const fractional = point === -1 ? "" : unsigned.slice(point + 1);

	const body =
		groupIntegral_(integral, skeleton) +
		(fractional === ""
			? ""
			: skeleton.decimalSeparator + mapDigits_(fractional, skeleton.digits));

	return `${skeleton.prefix}${negative ? minusSign : ""}${body}${skeleton.suffix}`;
}

function groupIntegral_(
	integral: string,
	skeleton: LocaleNumberSkeleton,
): string {
	const [primary, secondary] = skeleton.groupSizes;

	if (
		primary === 0 ||
		skeleton.groupSeparator === "" ||
		// CLDR puts no separator in until the leading group is itself wide enough,
		// which is why `pl-PL` prints `1000` but `10 000`.
		integral.length < primary + skeleton.minimumGroupingDigits
	) {
		return mapDigits_(integral, skeleton.digits);
	}

	const groups: string[] = [integral.slice(-primary)];
	let remaining = integral.slice(0, -primary);

	while (remaining.length > secondary) {
		groups.unshift(remaining.slice(-secondary));
		remaining = remaining.slice(0, -secondary);
	}

	groups.unshift(remaining);

	return groups
		.map((group) => mapDigits_(group, skeleton.digits))
		.join(skeleton.groupSeparator);
}

function mapDigits_(digits: string, into: readonly string[]): string {
	let mapped = "";

	for (let index = 0; index < digits.length; index++) {
		mapped += into[digits.charCodeAt(index) - 48] ?? digits[index];
	}

	return mapped;
}
