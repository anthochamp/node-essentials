import { MASK_64N } from "../../constants/mask.js";
import { mask64 } from "./mask64.js";

/**
 * Reverses the bit order within the low 64 bits of `value`.
 *
 * The 64-bit counterpart of {@link bitReverse32}: the same halving strategy
 * (pairs, nibbles, bytes, halfwords, then the two 32-bit halves) with `bigint`
 * masks.
 *
 * @param value - The value to reverse; only its low 64 bits are considered.
 * @returns The bit-reversed value as an unsigned 64-bit integer.
 */
export function bitReverse64(value: bigint): bigint {
	let v = mask64(value);

	v = ((v >> 1n) & 0x5555555555555555n) | ((v & 0x5555555555555555n) << 1n);
	v = ((v >> 2n) & 0x3333333333333333n) | ((v & 0x3333333333333333n) << 2n);
	v = ((v >> 4n) & 0x0f0f0f0f0f0f0f0fn) | ((v & 0x0f0f0f0f0f0f0f0fn) << 4n);
	v = ((v >> 8n) & 0x00ff00ff00ff00ffn) | ((v & 0x00ff00ff00ff00ffn) << 8n);
	v = ((v >> 16n) & 0x0000ffff0000ffffn) | ((v & 0x0000ffff0000ffffn) << 16n);
	v = (v >> 32n) | ((v << 32n) & MASK_64N);

	return mask64(v);
}
