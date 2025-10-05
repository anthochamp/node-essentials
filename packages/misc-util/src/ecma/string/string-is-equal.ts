import { replaceDiacritics } from "./replace-diacritics.js";

export type StringIsEqualOptions = {
	// If true, the comparison is case insensitive.
	caseInsensitive?: boolean;

	// If true, diacritics (accents) are removed before comparison.
	replaceDiacritics?: boolean;
};

/**
 * Compares two strings for equality, with options for case insensitivity
 * and diacritic replacement.
 *
 * @param a The first string to compare.
 * @param b The second string to compare.
 * @param options Comparison options.
 * @returns True if the strings are considered equal based on the provided options; otherwise, false.
 */
export function stringIsEqual(
	a: string,
	b: string,
	options?: StringIsEqualOptions,
): boolean {
	if (options?.replaceDiacritics) {
		a = replaceDiacritics(a);
		b = replaceDiacritics(b);
	}

	if (a.length !== b.length) {
		return false;
	}

	if (options?.caseInsensitive) {
		a = a.toLowerCase();
		b = b.toLowerCase();
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
