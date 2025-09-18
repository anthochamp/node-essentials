/**
 * Converts a string to camel case.
 *
 * @param input The input string.
 * @returns The camel cased string.
 */
export function camelCase(input: string): string {
	return input
		.replace(/^[_.\- ]+/, "")
		.toLowerCase()
		.replace(/[_.\- ]+(\w|$)/g, (_, p1) => p1.toUpperCase());
}
