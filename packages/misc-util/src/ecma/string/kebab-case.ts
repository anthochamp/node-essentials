/**
 * Converts a string to kebab case.
 *
 * @param input The input string.
 * @returns The kebab cased string.
 */
export function kebabCase(input: string): string {
	return input
		.replace(/(^[_.\- ]+)|([_.\- ]+$)/g, "")
		.toLowerCase()
		.replace(/[_.\- ]+(\w|$)/g, (_, p1) => `-${p1.toLowerCase()}`);
}
