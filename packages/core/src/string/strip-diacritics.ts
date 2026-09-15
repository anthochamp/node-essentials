const COMBINING_MARK_PATTERN = /\p{Mn}/gu;

/**
 * Strips diacritics (accents) from `str` by decomposing each accented character
 * into its base letter plus combining marks (Unicode compatibility
 * decomposition, NFKD) and dropping the marks.
 *
 * Does not affect letters with no decomposition at all — ligatures and special
 * letters like `Æ`, `Œ`, `Ø`, `Đ`, `Ł` pass through unchanged, since Unicode
 * defines no decomposition (canonical or compatibility) for them.
 */
export function stripDiacritics(str: string): string {
	return str.normalize("NFKD").replace(COMBINING_MARK_PATTERN, "");
}
