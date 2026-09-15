/**
 * Check if a value is an non-array object.
 *
 * This function returns false for any primitive and arrays.
 *
 * @param value The value to check
 * @returns True if the value is a non-array object
 */
export function isObject(value: unknown): value is object {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
