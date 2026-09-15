export type StringIsEqualOptions = {
	// If true, the comparison is case insensitive.
	caseInsensitive?: boolean;

	/**
	 * The locale(s) to use for case conversion when caseInsensitive is true.
	 *
	 * If not provided, the `String.prototype.toLowerCase` method is used, which
	 * may not handle locale-specific case mappings correctly. If provided, it
	 * should be a string or an array of strings representing the locale(s) to use
	 * for case conversion.
	 *
	 * Note: The locale(s) are only used for case conversion, not for collation.
	 * For example, the Turkish locale has special rules for the letter "i", which
	 * may affect the result of a case-insensitive comparison.
	 */
	locale?: string | string[] | null;
};

/**
 * Compares two strings for equality, optionally case-insensitively.
 *
 * @param a The first string to compare.
 * @param b The second string to compare.
 * @param options Comparison options.
 * @returns True if the strings are considered equal based on the provided
 *   options; otherwise, false.
 */
export function stringIsEqual(
	a: string,
	b: string,
	options?: StringIsEqualOptions,
): boolean {
	if (options?.caseInsensitive) {
		a = options?.locale ? a.toLocaleLowerCase(options.locale) : a.toLowerCase();
		b = options?.locale ? b.toLocaleLowerCase(options.locale) : b.toLowerCase();
	}

	// After the transforms, not before: lowercasing can change length, as it does
	// for the Turkish dotted capital I.
	if (a.length !== b.length) {
		return false;
	}

	return a === b;
}

/**
 * Convenience function for case-insensitive string comparison.
 *
 * @param a The first string to compare.
 * @param b The second string to compare.
 * @returns True if the strings are equal, ignoring case; otherwise, false.
 */
export const stringIsEqualCaseInsensitive = (a: string, b: string): boolean =>
	stringIsEqual(a, b, { caseInsensitive: true });
