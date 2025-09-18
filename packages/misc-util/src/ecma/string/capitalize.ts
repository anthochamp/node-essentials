/**
 * Capitalizes the first letter of a string and the remaining letters as lower case.
 *
 * @param value The input string.
 * @returns The capitalized string.
 */
export function capitalize(value: string): string {
	if (value.length === 0) {
		return value;
	}
	return value[0].toUpperCase() + value.slice(1).toLowerCase();
}
