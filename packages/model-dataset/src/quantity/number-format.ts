/**
 * How a renderer should turn a numeric cell into text.
 *
 * A subset of `Intl.NumberFormatOptions`, so a renderer applies it by handing
 * it straight to `Intl.NumberFormat` rather than reimplementing formatting.
 * Restricted to the members that are meaningful without a locale decision and
 * that every output medium can honour.
 */
export type NumberFormatSpec = Pick<
	Intl.NumberFormatOptions,
	| "style"
	| "unit"
	| "unitDisplay"
	| "notation"
	| "useGrouping"
	| "minimumFractionDigits"
	| "maximumFractionDigits"
	| "minimumSignificantDigits"
	| "maximumSignificantDigits"
	| "signDisplay"
>;
