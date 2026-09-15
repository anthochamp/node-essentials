import { getUint32Le, rotl32 } from "@ac-kit/core";

const PRIME32_1 = 0x9e3779b1;
const PRIME32_2 = 0x85ebca77;
const PRIME32_3 = 0xc2b2ae3d;
const PRIME32_4 = 0x27d4eb2f;
const PRIME32_5 = 0x165667b1;

function round32_(accumulator: number, lane: number): number {
	const mixed = (accumulator + Math.imul(lane, PRIME32_2)) >>> 0;
	return Math.imul(rotl32(mixed, 13), PRIME32_1) >>> 0;
}

/**
 * Computes the XXH32 hash of `data` (Yann Collet, xxHash specification v0.2.0).
 *
 * The fastest of the 32-bit hashes here on inputs of 16 bytes or more: it
 * consumes four 4-byte lanes per stripe into independent accumulators, so the
 * inner loop pipelines well. Below 16 bytes it degrades to a single accumulator
 * and offers no advantage over {@link murmur3_32}.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to hash.
 * @param seed - The 32-bit seed, defaulting to `0`.
 * @returns An unsigned 32-bit digest.
 */
export function xxhash_32(data: Uint8Array, seed = 0): number {
	const { length } = data;
	let offset = 0;
	let accumulator: number;

	if (length >= 16) {
		let accumulator1 = (seed + PRIME32_1 + PRIME32_2) >>> 0;
		let accumulator2 = (seed + PRIME32_2) >>> 0;
		let accumulator3 = seed >>> 0;
		let accumulator4 = (seed - PRIME32_1) >>> 0;

		const limit = length - 16;
		while (offset <= limit) {
			accumulator1 = round32_(accumulator1, getUint32Le(data, offset));
			accumulator2 = round32_(accumulator2, getUint32Le(data, offset + 4));
			accumulator3 = round32_(accumulator3, getUint32Le(data, offset + 8));
			accumulator4 = round32_(accumulator4, getUint32Le(data, offset + 12));
			offset += 16;
		}

		accumulator =
			(rotl32(accumulator1, 1) +
				rotl32(accumulator2, 7) +
				rotl32(accumulator3, 12) +
				rotl32(accumulator4, 18)) >>>
			0;
	} else {
		accumulator = (seed + PRIME32_5) >>> 0;
	}

	accumulator = (accumulator + length) >>> 0;

	while (length - offset >= 4) {
		accumulator =
			(accumulator + Math.imul(getUint32Le(data, offset), PRIME32_3)) >>> 0;
		accumulator = Math.imul(rotl32(accumulator, 17), PRIME32_4) >>> 0;
		offset += 4;
	}

	while (offset < length) {
		accumulator = (accumulator + Math.imul(data[offset]!, PRIME32_5)) >>> 0;
		accumulator = Math.imul(rotl32(accumulator, 11), PRIME32_1) >>> 0;
		offset++;
	}

	accumulator = (accumulator ^ (accumulator >>> 15)) >>> 0;
	accumulator = Math.imul(accumulator, PRIME32_2) >>> 0;
	accumulator = (accumulator ^ (accumulator >>> 13)) >>> 0;
	accumulator = Math.imul(accumulator, PRIME32_3) >>> 0;
	return (accumulator ^ (accumulator >>> 16)) >>> 0;
}
