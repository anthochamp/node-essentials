/**
 * Check if a value is an array.
 *
 * @param value The value to check
 * @returns True if the value is an array
 */
export function isArray<T>(value: unknown): value is Array<T> {
	return Array.isArray(value);
}
