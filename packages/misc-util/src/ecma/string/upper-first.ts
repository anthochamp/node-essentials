/**
 * Converts the first letter of a string to upper case.
 *
 * @param input The input string.
 * @returns The string with the first letter converted to upper case.
 */
export function upperFirst(input: string): Capitalize<string> {
	if (input.length === 0) {
		return input as Capitalize<string>;
	}
	return (input[0].toUpperCase() + input.slice(1)) as Capitalize<string>;
}
