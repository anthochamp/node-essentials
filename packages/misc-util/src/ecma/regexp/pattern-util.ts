import type { Pattern } from "./types.js";

/**
 * Enclose the pattern with a capture group, optionally named with `name`
 *
 * If `name` is not provided, the capture group will be non-capturing.
 *
 * @param pattern The pattern to be captured.
 * @param name Optional name for the capture group.
 * @returns The pattern string enclosed in a capture group.
 */
export function patternCapture(pattern: Pattern, name?: string): Pattern {
	return name ? `(?<${name}>${pattern})` : `(?:${pattern})`;
}

export type PatternInOutCaptureOptions = {
	prePattern?: Pattern;
	postPattern?: Pattern;
	inCaptureName?: string;
	outCaptureName?: string;
};

/**
 * Enclose the pattern with in-out capture groups, provided `pre`/`post` pattern strings.
 *
 * `inCaptureName` is the name of the inner capture group (the main pattern).
 * `outCaptureName` is the name of the outer capture group (the whole pattern with pre/post).
 *
 * If `inCaptureName` is not provided, the inner capture group will be non-capturing.
 * If `outCaptureName` is not provided, the outer capture group will be non-capturing.
 *
 * The `prePattern` and `postPattern` are added before and after the main pattern, respectively.
 *
 * Exemple:
 * ```ts
 * const pattern = patternInOutCapture("\\d+", {
 * 	prePattern: "\\(",
 *  postPattern: "\\)",
 *  inCaptureName: "number",
 *  outCaptureName: "parenthesizedNumber",
 * });
 * // pattern is "(?<(parenthesizedNumber)>(?:\\((?<number>\\d+)\\)))"
 * // new RegExp(pattern) is /(?(<parenthesizedNumber>)(?:\((?<number>\d+)\)))/
 * ```
 *
 * @param pattern The main pattern to be captured.
 * @param options Options for pre/post patterns and capture group names.
 * @returns The composed pattern string with in-out capture groups.
 */
export function patternInOutCapture(
	pattern: Pattern,
	{
		prePattern = "",
		postPattern = "",
		inCaptureName,
		outCaptureName,
	}: PatternInOutCaptureOptions = {},
): Pattern {
	const inPattern =
		prePattern + patternCapture(pattern, inCaptureName) + postPattern;
	return patternCapture(inPattern, outCaptureName);
}
