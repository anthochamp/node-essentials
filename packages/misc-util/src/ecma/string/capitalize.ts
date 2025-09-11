/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(value: string): Capitalize<string> {
	return ((value[0] ?? "").toUpperCase() +
		value.slice(1)) as Capitalize<string>;
}
