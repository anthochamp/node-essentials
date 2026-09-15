/**
 * Minimum number of bytes needed to hold `bits` bits.
 *
 * @param bits - The number of bits to fit, non-negative.
 * @returns `⌈bits / 8⌉`.
 */
export function bytesForBits(bits: number): number {
	return (bits + 7) >>> 3;
}
