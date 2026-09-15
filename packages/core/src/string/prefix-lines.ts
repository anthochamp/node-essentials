export type PrefixLinesOptions = {
	// If true, the first line will not be prefixed.
	// Defaults to false.
	skipFirstLine?: boolean;

	// If true, empty lines will not be prefixed.
	// Defaults to false.
	skipEmptyLines?: boolean;
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
	const skipFirstLine = options?.skipFirstLine ?? false;
	const skipEmptyLines = options?.skipEmptyLines ?? false;

	const lines = Array.isArray(text) ? text : [text];

	return lines
		.flatMap((line) => line.split(/\r?\n/))
		.map((line, index) =>
			(index === 0 && skipFirstLine) || (line.length === 0 && skipEmptyLines)
				? line
				: `${prefix}${line}`,
		);
}
