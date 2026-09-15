/**
 * Check if a value is an `ArrayBuffer`.
 *
 * A `SharedArrayBuffer` does not pass — the two are distinct types with
 * distinct ownership semantics. Use `isSharedArrayBuffer` for that one.
 *
 * Realm-bound: an `ArrayBuffer` built in another realm (worker, iframe, vm
 * context) is not recognised.
 *
 * @param value The value to check
 * @returns True if the value is an `ArrayBuffer`
 */
export function isArrayBuffer(value: unknown): value is ArrayBuffer {
	return value instanceof ArrayBuffer;
}
