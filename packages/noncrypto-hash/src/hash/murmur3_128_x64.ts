import { getBigUint64Le, MASK_64N, rotl64, setBigUint64Le } from "@ac-kit/core";

import { fmix64 } from "./_murmur3_base.js";

const C1_64 = 0x87c37b91114253d5n;
const C2_64 = 0x4cf5ad432745937fn;

/**
 * Computes the MurmurHash3 x64 128-bit hash of `data`.
 *
 * The variant used by Cassandra, Kafka and Elasticsearch for partitioning. In
 * JavaScript it runs on `bigint` arithmetic and is therefore several times
 * slower than {@link murmur3_128_x86}; pick it only when wire compatibility
 * requires it.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to hash.
 * @param seed - The 32-bit seed, defaulting to `0`.
 * @returns A 16-byte digest, two little-endian 64-bit words.
 */
export function murmur3_128_x64(
	data: Uint8Array,
	seed = 0,
): Uint8Array<ArrayBuffer> {
	const { length } = data;
	const blockCount = (length / 16) | 0;
	let h1 = BigInt(seed >>> 0);
	let h2 = h1;

	for (let i = 0; i < blockCount; i++) {
		const offset = i * 16;
		const k1 = getBigUint64Le(data, offset);
		const k2 = getBigUint64Le(data, offset + 8);

		h1 ^= (rotl64((k1 * C1_64) & MASK_64N, 31n) * C2_64) & MASK_64N;
		h1 = rotl64(h1, 27n);
		h1 = ((h1 + h2) * 5n + 0x52dce729n) & MASK_64N;

		h2 ^= (rotl64((k2 * C2_64) & MASK_64N, 33n) * C1_64) & MASK_64N;
		h2 = rotl64(h2, 31n);
		h2 = ((h2 + h1) * 5n + 0x38495ab5n) & MASK_64N;
	}

	const tail = blockCount * 16;
	const tailLength = length & 15;
	// A zero-length lane yields k = 0, whose scramble is 0, so the XOR is a no-op.
	const t1 = getBigUint64Le(data, tail, Math.min(tailLength, 8));
	const t2 = getBigUint64Le(data, tail + 8, Math.max(tailLength - 8, 0));

	h1 ^= (rotl64((t1 * C1_64) & MASK_64N, 31n) * C2_64) & MASK_64N;
	h2 ^= (rotl64((t2 * C2_64) & MASK_64N, 33n) * C1_64) & MASK_64N;

	h1 ^= BigInt(length);
	h2 ^= BigInt(length);
	h1 = (h1 + h2) & MASK_64N;
	h2 = (h2 + h1) & MASK_64N;
	h1 = fmix64(h1);
	h2 = fmix64(h2);
	h1 = (h1 + h2) & MASK_64N;
	h2 = (h2 + h1) & MASK_64N;

	const digest = new Uint8Array(16);
	setBigUint64Le(digest, 0, h1);
	setBigUint64Le(digest, 8, h2);
	return digest;
}
