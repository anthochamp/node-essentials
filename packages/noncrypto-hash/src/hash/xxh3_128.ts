import { MASK_64N, setBigUint64Le } from "@ac-kit/core";

import { xxh3Digest128_ } from "./_xxh3-base.js";

/**
 * Computes the XXH3-128 hash of `data` (Yann Collet, xxHash specification
 * v0.2.0).
 *
 * More mixing than {@link xxh3_64} for a small overhead on short inputs; the
 * low 64 bits of the result always equal {@link xxh3_64}'s own output for the
 * same `data` and `seed`.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to hash.
 * @param seed - The 64-bit seed, defaulting to `0n`.
 * @returns A 16-byte digest, two little-endian 64-bit words (low half first).
 */
export function xxh3_128(
	data: Uint8Array,
	seed: bigint = 0n,
): Uint8Array<ArrayBuffer> {
	const { low, high } = xxh3Digest128_(data, seed & MASK_64N);
	const digest = new Uint8Array(16);

	setBigUint64Le(digest, 0, low);
	setBigUint64Le(digest, 8, high);

	return digest;
}
