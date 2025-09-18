/**
 * Converts a string to start case, replacing word separators with spaces and
 * capitalizing the first letter of each word.
 *
 * @param input The input string.
 * @returns The start cased string.
 */
export function startCase(input: string): string {
	return input
		.replace(/(^[_.\- ]+)|([_.\- ]+$)/g, "")
		.toLowerCase()
		.replace(/[_.\- ]+(\w|$)/g, (_, p1) => ` ${p1.toUpperCase()}`)
		.replace(/^\w/, (c) => c.toUpperCase());
}
