/**
 * Check if a value is a `RegExp`.
 *
 * Realm-bound: a `RegExp` built in another realm (worker, iframe, vm context)
 * is not recognised.
 *
 * @param value The value to check
 * @returns True if the value is a `RegExp`
 */
export function isRegExp(value: unknown): value is RegExp {
	return value instanceof RegExp;
}
