/**
 * Escape special characters in a string to be used in a regular expression pattern.
 *
 * @param str The input string to escape.
 * @returns The escaped string safe for use in a regular expression.
 */
export function regexpEscape(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
