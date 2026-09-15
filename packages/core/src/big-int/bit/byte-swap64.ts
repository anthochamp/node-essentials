import { mask64 } from "./mask64.js";

/**
 * Reverses the byte order within the low 64 bits of `value`.
 *
 * The 64-bit counterpart of {@link byteSwap32}: swaps adjacent byte-pairs, then
 * 16-bit halfwords, then the two 32-bit halves, with `bigint` masks.
 *
 * @param value - The value to byte-swap; only its low 64 bits are considered.
 * @returns The byte-swapped value as an unsigned 64-bit integer.
 */
export function byteSwap64(value: bigint): bigint {
	let v = mask64(value);

	v = ((v >> 8n) & 0x00ff00ff00ff00ffn) | ((v & 0x00ff00ff00ff00ffn) << 8n);
	v = ((v >> 16n) & 0x0000ffff0000ffffn) | ((v & 0x0000ffff0000ffffn) << 16n);
	v = (v >> 32n) | mask64(v << 32n);

	return mask64(v);
}
