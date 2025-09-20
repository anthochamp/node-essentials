/**
 * Converts a string to lower case, replacing word separators with spaces.
 *
 * @param input The input string.
 * @returns The lower cased string.
 */
export function lowerCase(input: string): string {
	return input
		.replace(/(^[_.\- ]+)|([_.\- ]+$)/g, "")
		.toLowerCase()
		.replace(/[_.\- ]+(\w|$)/g, (_, p1) => ` ${p1.toLowerCase()}`);
}
