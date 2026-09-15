/**
 * Check if a value is thenable, and so can be awaited as a promise.
 *
 * Structural rather than `instanceof Promise`: a value from another realm, a
 * userland promise implementation, or a plain function returning
 * `Promise.resolve()` are all awaitable and none of them are `Promise`.
 *
 * @param value The value to check
 * @returns True if the value has a callable `then`
 */
export function isThenable<T = unknown>(
	value: unknown,
): value is PromiseLike<T> {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { then?: unknown }).then === "function"
	);
}
