/**
 * `⌊2^(128 × words) / modulus⌋` — the Barrett reduction reciprocal. Computed
 * once per modulus from public data.
 */
export function barrettMu(modulus: bigint, words: number): bigint {
	return (1n << BigInt(128 * words)) / modulus;
}
