import { bigIntToBytesBe } from "./to-bytes-be.js";

/**
 * Encodes a `bigint` as two's complement, little-endian bytes.
 *
 * The byte order native to x86 and ARM, and what Python's `int.to_bytes(…,
 * "little")` produces. Reach for {@link bigIntToBytesBe} when the most
 * significant byte comes first, which is what wire formats usually specify, and
 * for `@ac-kit/math-integer`'s `limb32`/`limb64` families when the digits feed
 * arithmetic rather than a buffer: those are wider, unsigned, and of fixed
 * width.
 *
 * Time complexity: O(n) in the byte count.
 *
 * @param value - The value to encode. Zero encodes as a single `0x00`. @param
 * byteLength - Fixed output width, sign-extended to fit. Omit for the minimal
 * encoding. @returns A fresh buffer, never empty. @throws {RangeError} When
 * `byteLength` is too small to hold `value`.
 */
export function bigIntToBytesLe(
	value: bigint,
	byteLength?: number,
): Uint8Array<ArrayBuffer> {
	return bigIntToBytesBe(value, byteLength).reverse();
}
