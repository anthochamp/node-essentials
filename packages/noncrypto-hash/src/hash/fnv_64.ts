import { MASK_64N } from "@ac-kit/core";

const OFFSET_BASIS_ = 0xcbf29ce484222325n;
const PRIME_ = 0x00000100000001b3n;

/**
 * Computes the 64-bit FNV-1a hash of `data`.
 *
 * Uses `bigint` arithmetic, so it is markedly slower than {@link fnv1a32} — use
 * it when a 64-bit fingerprint is required, not as a general-purpose bucketing
 * hash.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to hash.
 * @param seed - The initial state, defaulting to the canonical offset basis.
 * @returns An unsigned 64-bit digest.
 */
export function fnv1a_64(
	data: Uint8Array,
	seed: bigint = OFFSET_BASIS_,
): bigint {
	let hash = seed & MASK_64N;
	for (let i = 0; i < data.length; i++) {
		hash = ((hash ^ BigInt(data[i]!)) * PRIME_) & MASK_64N;
	}
	return hash;
}

/**
 * Computes the 64-bit FNV-1 hash of `data` (multiply-then-XOR order).
 *
 * Superseded by {@link fnv1a_64}, which has strictly better dispersion.
 * Provided for interoperability with systems that specify FNV-1.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to hash.
 * @param seed - The initial state, defaulting to the canonical offset basis.
 * @returns An unsigned 64-bit digest.
 */
export function fnv1_64(
	data: Uint8Array,
	seed: bigint = OFFSET_BASIS_,
): bigint {
	let hash = seed & MASK_64N;
	for (let i = 0; i < data.length; i++) {
		hash = ((hash * PRIME_) & MASK_64N) ^ BigInt(data[i]!);
	}
	return hash;
}
