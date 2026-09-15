import { MASK_64N } from "@ac-kit/core";

import { xxh3Digest64_ } from "./_xxh3-base.js";

/**
 * Computes the XXH3-64 hash of `data` (Yann Collet, xxHash specification
 * v0.2.0).
 *
 * The newer, faster successor to {@link xxhash64}: SIMD-friendly on platforms
 * with vector support, and competitive even without it. Uses the algorithm's
 * default 192-byte secret; a caller-supplied secret is out of scope here —
 * reach for `seed` instead.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to hash.
 * @param seed - The 64-bit seed, defaulting to `0n`.
 * @returns An unsigned 64-bit digest.
 */
export function xxh3_64(data: Uint8Array, seed: bigint = 0n): bigint {
	return xxh3Digest64_(data, seed & MASK_64N);
}
