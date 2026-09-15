/**
 * `R² mod modulus`, where `R = 2^(64 × words)` — the constant that converts a
 * value into Montgomery form. Computed once per modulus from public data.
 */
export function montgomeryRSquared(modulus: bigint, words: number): bigint {
	const r = 1n << BigInt(64 * words);

	return (r * r) % modulus;
}
