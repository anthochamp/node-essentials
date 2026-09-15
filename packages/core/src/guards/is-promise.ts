/**
 * Check if a value is a `Promise`.
 *
 * This is a brand check, unlike `isThenable`, which answers the broader
 * structural question and accepts any object carrying a callable `then`. Use
 * this one to identify a genuine `Promise`, and `isThenable` to decide whether
 * a value can be awaited.
 *
 * Realm-bound: a `Promise` built in another realm (worker, iframe, vm context)
 * is not recognised.
 *
 * @param value The value to check
 * @returns True if the value is a `Promise`
 */
export function isPromise(value: unknown): value is Promise<unknown> {
	return value instanceof Promise;
}
