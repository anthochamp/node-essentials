/**
 * Check if a value is a `WeakMap`.
 *
 * Realm-bound: a `WeakMap` built in another realm (worker, iframe, vm context)
 * is not recognised.
 *
 * @param value The value to check
 * @returns True if the value is a `WeakMap`
 */
export function isWeakMap(value: unknown): value is WeakMap<WeakKey, unknown> {
	return value instanceof WeakMap;
}
