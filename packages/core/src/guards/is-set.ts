/**
 * Check if a value is a `Set`.
 *
 * Realm-bound: a `Set` built in another realm (worker, iframe, vm context) is
 * not recognised.
 *
 * @param value The value to check
 * @returns True if the value is a `Set`
 */
export function isSet(value: unknown): value is Set<unknown> {
	return value instanceof Set;
}
