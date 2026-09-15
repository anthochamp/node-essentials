/**
 * Minimum number of words required to hold `bits` bits, given a word width of
 * `width` bits.
 *
 * @param bits - The number of bits to fit, non-negative.
 * @param width - The width of a word in bits, positive.
 * @returns `⌈bits / width⌉`.
 */
export function wordsForBits(bits: number, width: number): number {
	return Math.ceil(bits / width);
}
