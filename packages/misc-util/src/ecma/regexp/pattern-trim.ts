import type { Pattern } from "./types.js";

/**
 * Trims the specified pattern from the start and end of the string.
 *
 * This method is like `String.prototype.trim()`, but allows specifying a custom
 * pattern.
 *
 * @param string The string to be trimmed.
 * @param pattern The pattern to be trimmed. If not provided, whitespace and line terminators are trimmed.
 * @returns The trimmed string.
 */
export function patternTrim(string: string, pattern?: Pattern): string {
	if (!pattern) {
		return string.trim();
	}

	const regex = new RegExp(`(?:^(?:${pattern})+)|(?:(?:${pattern})+$)`, "g");
	return string.replace(regex, "");
}

/**
 * Trims the specified pattern from the start of the string.
 *
 * This method is like `String.prototype.trimStart()`, but allows specifying a
 * custom pattern.
 *
 * @param string The string to be trimmed.
 * @param pattern The pattern to be trimmed. If not provided, whitespace and line terminators are trimmed.
 * @returns The trimmed string.
 */
export function patternTrimStart(string: string, pattern?: Pattern): string {
	if (!pattern) {
		return string.trimStart();
	}

	const regex = new RegExp(`^(?:${pattern})+`, "g");
	return string.replace(regex, "");
}

/**
 * Trims the specified pattern from the end of the string.
 *
 * This method is like `String.prototype.trimEnd()`, but allows specifying a
 * custom pattern.
 *
 * @param string The string to be trimmed.
 * @param pattern The pattern to be trimmed. If not provided, whitespace and line terminators are trimmed.
 * @returns The trimmed string.
 */
export function patternTrimEnd(string: string, pattern?: Pattern): string {
	if (!pattern) {
		return string.trimEnd();
	}

	const regex = new RegExp(`(?:${pattern})+$`, "g");
	return string.replace(regex, "");
}
