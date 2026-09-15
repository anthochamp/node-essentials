/**
 * Check if a value is a `Map`.
 *
 * Realm-bound: a `Map` built in another realm (worker, iframe, vm context) is
 * not recognised.
 *
 * @param value The value to check
 * @returns True if the value is a `Map`
 */
export function isMap(value: unknown): value is Map<unknown, unknown> {
	return value instanceof Map;
}
