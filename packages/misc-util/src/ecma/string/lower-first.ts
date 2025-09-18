/**
 * Converts the first letter of a string to lower case.
 *
 * @param input The input string.
 * @returns The string with the first letter converted to lower case.
 */
export function lowerFirst(input: string): string {
	if (input.length === 0) {
		return input;
	}
	return input[0].toLowerCase() + input.slice(1);
}
