/**
 * Returns the value passed as argument.
 *
 * @param value The value to return.
 * @returns The same value.
 */
export function identity<T>(value: T): T {
	return value;
}
