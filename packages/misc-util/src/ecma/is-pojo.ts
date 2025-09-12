/**
 * Check if a value is a Plain Old Javascript Object (POJO).
 * i.e. an object created by the `{}` literal, `new Object()`, or `Object.create(null)`.
 *
 * @param value The value to check
 * @returns True if the value is a POJO
 */
export function isPojo(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		(value.constructor === Object || Object.getPrototypeOf(value) === null)
	);
}
