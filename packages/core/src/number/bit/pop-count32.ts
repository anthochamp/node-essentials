/**
 * Counts the set bits in the low 32 bits of `value` (Hamming weight).
 *
 * SWAR (SIMD-within-a-register): sums adjacent bit-pairs, then nibbles, then
 * bytes, then all four bytes in one multiply — no loop, no lookup table.
 *
 * @param value - The value to count; only its low 32 bits are considered.
 * @returns The number of set bits, from 0 to 32.
 */
export function popCount32(value: number): number {
	let v = value >>> 0;

	v = v - ((v >>> 1) & 0x55555555);
	v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
	v = (v + (v >>> 4)) & 0x0f0f0f0f;

	return (v * 0x01010101) >>> 24;
}
