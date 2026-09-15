import { getUint32Le, rotl32 } from "@ac-kit/core";

import { fmix32 } from "./_murmur3_base.js";

const C1_32 = 0xcc9e2d51;
const C2_32 = 0x1b873593;

function scramble32_(block: number): number {
	return Math.imul(rotl32(Math.imul(block, C1_32), 15), C2_32) >>> 0;
}

/**
 * Computes the MurmurHash3 x86 32-bit hash of `data` (Austin Appleby, 2011).
 *
 * A good general-purpose hash-table hash: proper finalization mix, so every
 * output bit is usable. Slower than `xxhash32` on long inputs, comparable on
 * short ones. Not resistant to hash-flooding — use SipHash for adversarial
 * input.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to hash.
 * @param seed - The 32-bit seed, defaulting to `0`.
 * @returns An unsigned 32-bit digest.
 */
export function murmur3_32(data: Uint8Array, seed = 0): number {
	const { length } = data;
	const blockCount = length >>> 2;
	let hash = seed >>> 0;

	for (let i = 0; i < blockCount; i++) {
		hash = (hash ^ scramble32_(getUint32Le(data, i * 4))) >>> 0;
		hash = rotl32(hash, 13);
		hash = (Math.imul(hash, 5) + 0xe6546b64) >>> 0;
	}

	const tail = blockCount * 4;
	hash = (hash ^ scramble32_(getUint32Le(data, tail, length & 3))) >>> 0;

	return fmix32((hash ^ length) >>> 0);
}
