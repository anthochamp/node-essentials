/**
 * Converts a string to upper case, replacing word separators with spaces.
 *
 * @param input The input string.
 * @returns The string converted to upper case, with word separators replaced by spaces.
 */
export function upperCase(input: string): string {
	return input
		.replace(/(^[_.\- ]+)|([_.\- ]+$)/g, "")
		.toUpperCase()
		.replace(/[_.\- ]+(\w|$)/g, (_, p1) => ` ${p1.toUpperCase()}`);
}
