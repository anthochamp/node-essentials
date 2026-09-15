import { MASK_64N, getBigUint64Le, getUint32Le, rotl64 } from "@ac-kit/core";

const PRIME64_1 = 0x9e3779b185ebca87n;
const PRIME64_2 = 0xc2b2ae3d27d4eb4fn;
const PRIME64_3 = 0x165667b19e3779f9n;
const PRIME64_4 = 0x85ebca77c2b2ae63n;
const PRIME64_5 = 0x27d4eb2f165667c5n;

function round64_(accumulator: bigint, lane: bigint): bigint {
	const mixed = (accumulator + lane * PRIME64_2) & MASK_64N;
	return (rotl64(mixed, 31n) * PRIME64_1) & MASK_64N;
}

function mergeAccumulator64_(accumulator: bigint, lane: bigint): bigint {
	const merged = ((accumulator ^ round64_(0n, lane)) * PRIME64_1) & MASK_64N;
	return (merged + PRIME64_4) & MASK_64N;
}

/**
 * Computes the XXH64 hash of `data` (Yann Collet, xxHash specification v0.2.0).
 *
 * The reference recommendation for 64-bit digests on 64-bit hardware, but in
 * JavaScript it runs on `bigint` arithmetic and is therefore slower than
 * {@link xxhash32}, not faster. Choose it for the wider digest, not for speed.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to hash.
 * @param seed - The 64-bit seed, defaulting to `0n`.
 * @returns An unsigned 64-bit digest.
 */
export function xxhash_64(data: Uint8Array, seed = 0n): bigint {
	const { length } = data;
	const seed64 = seed & MASK_64N;
	let offset = 0;
	let accumulator: bigint;

	if (length >= 32) {
		let accumulator1 = (seed64 + PRIME64_1 + PRIME64_2) & MASK_64N;
		let accumulator2 = (seed64 + PRIME64_2) & MASK_64N;
		let accumulator3 = seed64;
		let accumulator4 = (seed64 - PRIME64_1) & MASK_64N;

		const limit = length - 32;
		while (offset <= limit) {
			accumulator1 = round64_(accumulator1, getBigUint64Le(data, offset));
			accumulator2 = round64_(accumulator2, getBigUint64Le(data, offset + 8));
			accumulator3 = round64_(accumulator3, getBigUint64Le(data, offset + 16));
			accumulator4 = round64_(accumulator4, getBigUint64Le(data, offset + 24));
			offset += 32;
		}

		accumulator =
			(rotl64(accumulator1, 1n) +
				rotl64(accumulator2, 7n) +
				rotl64(accumulator3, 12n) +
				rotl64(accumulator4, 18n)) &
			MASK_64N;
		accumulator = mergeAccumulator64_(accumulator, accumulator1);
		accumulator = mergeAccumulator64_(accumulator, accumulator2);
		accumulator = mergeAccumulator64_(accumulator, accumulator3);
		accumulator = mergeAccumulator64_(accumulator, accumulator4);
	} else {
		accumulator = (seed64 + PRIME64_5) & MASK_64N;
	}

	accumulator = (accumulator + BigInt(length)) & MASK_64N;

	while (length - offset >= 8) {
		accumulator ^= round64_(0n, getBigUint64Le(data, offset));
		accumulator = (rotl64(accumulator, 27n) * PRIME64_1) & MASK_64N;
		accumulator = (accumulator + PRIME64_4) & MASK_64N;
		offset += 8;
	}

	if (length - offset >= 4) {
		accumulator ^= (BigInt(getUint32Le(data, offset)) * PRIME64_1) & MASK_64N;
		accumulator = (rotl64(accumulator, 23n) * PRIME64_2) & MASK_64N;
		accumulator = (accumulator + PRIME64_3) & MASK_64N;
		offset += 4;
	}

	while (offset < length) {
		accumulator ^= (BigInt(data[offset]!) * PRIME64_5) & MASK_64N;
		accumulator = (rotl64(accumulator, 11n) * PRIME64_1) & MASK_64N;
		offset++;
	}

	accumulator ^= accumulator >> 33n;
	accumulator = (accumulator * PRIME64_2) & MASK_64N;
	accumulator ^= accumulator >> 29n;
	accumulator = (accumulator * PRIME64_3) & MASK_64N;
	accumulator ^= accumulator >> 32n;
	return accumulator;
}
