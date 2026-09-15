import type { TypedArray } from "type-fest";

/**
 * Check if a value is a typed array (`Uint8Array`, `Float64Array`,
 * `BigInt64Array`, …).
 *
 * A `DataView` does not pass: it is an `ArrayBuffer` view but not a typed
 * array, and it has no element type.
 *
 * Unlike the other buffer guards this one is realm-agnostic, because
 * `ArrayBuffer.isView` inspects the internal slot rather than the prototype.
 *
 * @param value The value to check
 * @returns True if the value is a typed array
 */
export function isTypedArray(value: unknown): value is TypedArray {
	return ArrayBuffer.isView(value) && !(value instanceof DataView);
}
