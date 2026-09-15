const OFFSET_BASIS_ = 5381;

/**
 * Computes the djb2 hash (Daniel J. Bernstein, 1991) of `data`.
 *
 * The original additive variant: `hash = hash * 33 + byte`. Extremely fast but
 * with weak avalanche — suitable for symbol tables and seeding, not for
 * adversarial input. Prefer {@link fnv1a32} or `xxhash32` when distribution
 * quality matters.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to hash.
 * @param seed - The initial state, defaulting to the canonical basis `5381`.
 * @returns An unsigned 32-bit digest.
 */
export function djb2(data: Uint8Array, seed: number = OFFSET_BASIS_): number {
	let hash = seed >>> 0;
	for (let i = 0; i < data.length; i++) {
		hash = (Math.imul(hash, 33) + data[i]!) >>> 0;
	}
	return hash;
}

/**
 * Computes the djb2a hash (the XOR variant of djb2) of `data`.
 *
 * Replaces the addition of the original djb2 with a XOR: `hash = hash * 33 ^
 * byte`. The XOR spreads each input byte over more of the state than the
 * addition does, giving modestly better dispersion at identical cost.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to hash.
 * @param seed - The initial state, defaulting to the canonical basis `5381`.
 * @returns An unsigned 32-bit digest.
 */
export function djb2a(data: Uint8Array, seed: number = OFFSET_BASIS_): number {
	let hash = seed >>> 0;
	for (let i = 0; i < data.length; i++) {
		hash = (Math.imul(hash, 33) ^ data[i]!) >>> 0;
	}
	return hash;
}
