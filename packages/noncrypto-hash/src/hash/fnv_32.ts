const OFFSET_BASIS_ = 0x811c9dc5;
const PRIME_ = 0x01000193;

/**
 * Computes the 32-bit FNV-1a hash (Fowler–Noll–Vo, XOR-then-multiply order) of
 * `data`.
 *
 * Better dispersion than {@link djb2a} for short, similar inputs at the same
 * cost. Note that FNV-1a has no finalization step, so its low bits are weaker
 * than those of `xxhash32` or `murmur3_32` — mask the high bits when
 * bucketing.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to hash.
 * @param seed - The initial state, defaulting to the canonical offset basis.
 * @returns An unsigned 32-bit digest.
 */
export function fnv1a_32(
	data: Uint8Array,
	seed: number = OFFSET_BASIS_,
): number {
	let hash = seed >>> 0;
	for (let i = 0; i < data.length; i++) {
		hash = Math.imul(hash ^ data[i]!, PRIME_) >>> 0;
	}
	return hash;
}

/**
 * Computes the 32-bit FNV-1 hash of `data` (multiply-then-XOR order).
 *
 * Superseded by {@link fnv1a_32}, which has strictly better dispersion.
 * Provided for interoperability with systems that specify FNV-1.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to hash.
 * @param seed - The initial state, defaulting to the canonical offset basis.
 * @returns An unsigned 32-bit digest.
 */
export function fnv1_32(
	data: Uint8Array,
	seed: number = OFFSET_BASIS_,
): number {
	let hash = seed >>> 0;
	for (let i = 0; i < data.length; i++) {
		hash = (Math.imul(hash, PRIME_) ^ data[i]!) >>> 0;
	}
	return hash;
}
