import { mask64 } from "./mask64.js";

/**
 * Rotates `value` left within 64 bits.
 *
 * `bigint` shifts are unbounded, so the result has to be masked back down to 64
 * bits after every rotation.
 *
 * @param value - The value to rotate; only its low 64 bits are considered.
 * @param count - The rotation distance, which must be in the `0n`..`64n` range.
 * @returns The rotated value as an unsigned 64-bit integer.
 */
export function rotl64(value: bigint, count: bigint): bigint {
	return mask64((value << count) | (value >> (64n - count)));
}
