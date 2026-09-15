import type { Pattern } from "./types.js";

/**
 * Creates a function that trims the specified pattern from the start and end of
 * a string. Prefer this over {@link patternTrim} when trimming the same pattern
 * repeatedly, as the regex is compiled once.
 *
 * @param pattern The pattern to trim. If not provided, whitespace and line
 *   terminators are trimmed.
 * @returns A function that trims the pattern from both ends of a string.
 */
export function buildPatternTrim(
	pattern?: Pattern,
): (string: string) => string {
	if (!pattern) {
		return (s) => s.trim();
	}
	const regex = new RegExp(`(?:^(?:${pattern})+)|(?:(?:${pattern})+$)`, "g");
	return (s) => s.replace(regex, "");
}

/**
 * Creates a function that trims the specified pattern from the start of a
 * string. Prefer this over {@link patternTrimStart} when trimming the same
 * pattern repeatedly, as the regex is compiled once.
 *
 * @param pattern The pattern to trim. If not provided, whitespace and line
 *   terminators are trimmed.
 * @returns A function that trims the pattern from the start of a string.
 */
export function buildPatternTrimStart(
	pattern?: Pattern,
): (string: string) => string {
	if (!pattern) {
		return (s) => s.trimStart();
	}
	const regex = new RegExp(`^(?:${pattern})+`);
	return (s) => s.replace(regex, "");
}

/**
 * Creates a function that trims the specified pattern from the end of a string.
 * Prefer this over {@link patternTrimEnd} when trimming the same pattern
 * repeatedly, as the regex is compiled once.
 *
 * @param pattern The pattern to trim. If not provided, whitespace and line
 *   terminators are trimmed.
 * @returns A function that trims the pattern from the end of a string.
 */
export function buildPatternTrimEnd(
	pattern?: Pattern,
): (string: string) => string {
	if (!pattern) {
		return (s) => s.trimEnd();
	}
	const regex = new RegExp(`(?:${pattern})+$`);
	return (s) => s.replace(regex, "");
}

/**
 * Trims the specified pattern from the start and end of the string.
 *
 * This method is like `String.prototype.trim()`, but allows specifying a custom
 * pattern. Use {@link buildPatternTrim} instead when trimming the same pattern
 * repeatedly.
 *
 * @param string The string to be trimmed.
 * @param pattern The pattern to be trimmed. If not provided, whitespace and
 *   line terminators are trimmed.
 * @returns The trimmed string.
 */
export function patternTrim(string: string, pattern?: Pattern): string {
	return buildPatternTrim(pattern)(string);
}

/**
 * Trims the specified pattern from the start of the string.
 *
 * This method is like `String.prototype.trimStart()`, but allows specifying a
 * custom pattern. Use {@link buildPatternTrimStart} instead when trimming the
 * same pattern repeatedly.
 *
 * @param string The string to be trimmed.
 * @param pattern The pattern to be trimmed. If not provided, whitespace and
 *   line terminators are trimmed.
 * @returns The trimmed string.
 */
export function patternTrimStart(string: string, pattern?: Pattern): string {
	return buildPatternTrimStart(pattern)(string);
}

/**
 * Trims the specified pattern from the end of the string.
 *
 * This method is like `String.prototype.trimEnd()`, but allows specifying a
 * custom pattern. Use {@link buildPatternTrimEnd} instead when trimming the same
 * pattern repeatedly.
 *
 * @param string The string to be trimmed.
 * @param pattern The pattern to be trimmed. If not provided, whitespace and
 *   line terminators are trimmed.
 * @returns The trimmed string.
 */
export function patternTrimEnd(string: string, pattern?: Pattern): string {
	return buildPatternTrimEnd(pattern)(string);
}
