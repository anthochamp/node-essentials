/**
 * Check if a value is a `SharedArrayBuffer`.
 *
 * Answers `false` rather than throwing where the constructor is absent —
 * browsers expose it only to cross-origin-isolated documents.
 *
 * Realm-bound: a `SharedArrayBuffer` built in another realm (worker, iframe, vm
 * context) is not recognised.
 *
 * @param value The value to check
 * @returns True if the value is a `SharedArrayBuffer`
 */
export function isSharedArrayBuffer(
	value: unknown,
): value is SharedArrayBuffer {
	return (
		typeof SharedArrayBuffer !== "undefined" &&
		value instanceof SharedArrayBuffer
	);
}
