/**
 * Joins non-empty strings from an array using the specified separator.
 *
 * @param values The array of strings to join.
 * @param separator The separator to use between non-empty strings.
 * @returns The joined string.
 */
export function joinNonEmpty(
	values: (string | null | undefined)[],
	separator: string,
): string {
	return values
		.filter((v) => typeof v === "string" && v.length > 0)
		.join(separator);
}
