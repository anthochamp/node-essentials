/**
 * Deep clone a value
 *
 * Based on `structuredClone`.
 *
 * @param value The value to clone
 * @returns The cloned value
 */
export function deepClone<T>(value: T): T {
	return structuredClone(value);
}
