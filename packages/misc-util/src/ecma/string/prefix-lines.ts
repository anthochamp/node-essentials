import { defaults } from "../object/defaults.js";

export type PrefixLinesOptions = {
	// If true, the first line will not be prefixed.
	// Defaults to false.
	skipFirstLine?: boolean;

	// If true, empty lines will not be prefixed.
	// Defaults to false.
	skipEmptyLines?: boolean;
};

const DEFAULT_PREFIX_LINES_OPTIONS: Required<PrefixLinesOptions> = {
	skipFirstLine: false,
	skipEmptyLines: false,
};

/**
 * Prefix each line of the given text with the given prefix.
 *
 * If the text is an array of strings, each string will be resplit into lines
 * (if necessary).
 *
 * @param text The text to prefix
 * @param prefix The prefix to add to each line
 * @param options Options for prefixing lines
 * @returns The prefixed text
 */
export function prefixLines(
	text: string | string[],
	prefix: string,
	options?: PrefixLinesOptions,
): string[] {
	const effectiveOptions = defaults(options, DEFAULT_PREFIX_LINES_OPTIONS);

	const lines = Array.isArray(text) ? text : [text];

	return lines
		.reduce((acc, line) => acc.concat(line.split(/\r?\n/)), [] as string[])
		.map((line, index) =>
			(index === 0 && effectiveOptions.skipFirstLine) ||
			(line.length === 0 && effectiveOptions.skipEmptyLines)
				? line
				: `${prefix}${line}`,
		);
}
