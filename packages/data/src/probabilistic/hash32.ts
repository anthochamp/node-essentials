import type { Callable } from "@ac-kit/core";

/**
 * Hashes an item to a 32-bit unsigned integer.
 *
 * **Required, never defaulted**: hashes — `murmur3_32`, `xxhash_32`, `fnv_32`,
 * `djb2` — all take a `Uint8Array`, and there is no canonical way to turn an
 * arbitrary `T` into bytes. Only the caller knows how its items should be
 * encoded, so only the caller can close that gap:
 *
 * ```ts
 * import { murmur3_32 } from "@ac-kit/noncrypto-hash";
 *
 * const encoder = new TextEncoder();
 * const hash: Hash32<string> = (item, seed) =>
 * 	murmur3_32(encoder.encode(item), seed);
 * ```
 *
 * The quality of the estimate is the quality of this function. It must
 * distribute uniformly and avalanche — a weak hash does not merely degrade the
 * false-positive rate, it invalidates the arithmetic these structures are
 * derived from.
 *
 * @param item The item to hash.
 * @param seed A per-call seed. The same `(item, seed)` pair must always give
 *   the same result.
 */
export type Hash32<T> = Callable<[item: T, seed: number], number>;
