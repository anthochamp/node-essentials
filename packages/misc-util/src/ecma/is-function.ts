/**
 * Check if a value is a function.
 *
 * @param value The value to check
 * @returns True if the value is a function
 */
// biome-ignore lint/complexity/noBannedTypes: intended
export function isFunction(value: unknown): value is Function {
	return typeof value === "function";
}
