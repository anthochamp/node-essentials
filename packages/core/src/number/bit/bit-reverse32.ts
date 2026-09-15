/**
 * Reverses the bit order within the low 32 bits of `value` — the bit at
 * position 0 moves to position 31 and so on.
 *
 * SWAR: swaps adjacent bit-pairs, then nibbles, then bytes, then the two 16-bit
 * halves — the same halving strategy as {@link popcount32}, applied to a swap
 * instead of a sum.
 *
 * @param value - The value to reverse; only its low 32 bits are considered.
 * @returns The bit-reversed value as an unsigned 32-bit integer.
 */
export function bitReverse32(value: number): number {
	let v = value >>> 0;

	v = ((v >>> 1) & 0x55555555) | ((v & 0x55555555) << 1);
	v = ((v >>> 2) & 0x33333333) | ((v & 0x33333333) << 2);
	v = ((v >>> 4) & 0x0f0f0f0f) | ((v & 0x0f0f0f0f) << 4);
	v = ((v >>> 8) & 0x00ff00ff) | ((v & 0x00ff00ff) << 8);
	v = (v >>> 16) | (v << 16);

	return v >>> 0;
}
