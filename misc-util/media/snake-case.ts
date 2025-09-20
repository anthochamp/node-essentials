/**
 * Converts a string to snake case.
 *
 * @param input The input string.
 * @returns The snake cased string.
 */
export function snakeCase(input: string): string {
	return input
		.replace(/(^[_.\- ]+)|([_.\- ]+$)/g, "")
		.toLowerCase()
		.replace(/[_.\- ]+(\w|$)/g, (_, p1) => `_${p1.toLowerCase()}`);
}
