/**
 * Check if a value is a `WeakSet`.
 *
 * Realm-bound: a `WeakSet` built in another realm (worker, iframe, vm context)
 * is not recognised.
 *
 * @param value The value to check
 * @returns True if the value is a `WeakSet`
 */
export function isWeakSet(value: unknown): value is WeakSet<WeakKey> {
	return value instanceof WeakSet;
}
