import { clamp, getUint32Le, rotl32, setUint32Le } from "@ac-kit/core";

import { fmix32 } from "./_murmur3_base.js";

const C1_128 = 0x239b961b;
const C2_128 = 0xab0e9789;
const C3_128 = 0x38b34ae5;
const C4_128 = 0xa1e38b93;

/**
 * Computes the MurmurHash3 x86 128-bit hash of `data`.
 *
 * Uses only 32-bit arithmetic, so it stays fast in JavaScript. It does **not**
 * produce the same digest as {@link murmur3_128_x64} — the two are distinct
 * algorithms, not two implementations of one.
 *
 * Complexity: O(n) in the byte length of `data`.
 *
 * @param data - The bytes to hash.
 * @param seed - The 32-bit seed, defaulting to `0`.
 * @returns A 16-byte digest, four little-endian 32-bit words.
 */
export function murmur3_128_x86(
	data: Uint8Array,
	seed = 0,
): Uint8Array<ArrayBuffer> {
	const { length } = data;
	const blockCount = (length / 16) | 0;
	let h1 = seed >>> 0;
	let h2 = seed >>> 0;
	let h3 = seed >>> 0;
	let h4 = seed >>> 0;

	for (let i = 0; i < blockCount; i++) {
		const offset = i * 16;
		const k1 = getUint32Le(data, offset);
		const k2 = getUint32Le(data, offset + 4);
		const k3 = getUint32Le(data, offset + 8);
		const k4 = getUint32Le(data, offset + 12);

		h1 = (h1 ^ Math.imul(rotl32(Math.imul(k1, C1_128), 15), C2_128)) >>> 0;
		h1 = rotl32(h1, 19);
		h1 = (Math.imul((h1 + h2) >>> 0, 5) + 0x561ccd1b) >>> 0;

		h2 = (h2 ^ Math.imul(rotl32(Math.imul(k2, C2_128), 16), C3_128)) >>> 0;
		h2 = rotl32(h2, 17);
		h2 = (Math.imul((h2 + h3) >>> 0, 5) + 0x0bcaa747) >>> 0;

		h3 = (h3 ^ Math.imul(rotl32(Math.imul(k3, C3_128), 17), C4_128)) >>> 0;
		h3 = rotl32(h3, 15);
		h3 = (Math.imul((h3 + h4) >>> 0, 5) + 0x96cd1c35) >>> 0;

		h4 = (h4 ^ Math.imul(rotl32(Math.imul(k4, C4_128), 18), C1_128)) >>> 0;
		h4 = rotl32(h4, 13);
		h4 = (Math.imul((h4 + h1) >>> 0, 5) + 0x32ac3b17) >>> 0;
	}

	const tail = blockCount * 16;
	const tailLength = length & 15;
	// A zero-length lane yields k = 0, whose scramble is 0, so the XOR is a no-op.
	const t1 = getUint32Le(data, tail, Math.min(tailLength, 4));
	const t2 = getUint32Le(data, tail + 4, clamp(tailLength - 4, 0, 4));
	const t3 = getUint32Le(data, tail + 8, clamp(tailLength - 8, 0, 4));
	const t4 = getUint32Le(data, tail + 12, Math.max(tailLength - 12, 0));

	h1 = (h1 ^ Math.imul(rotl32(Math.imul(t1, C1_128), 15), C2_128)) >>> 0;
	h2 = (h2 ^ Math.imul(rotl32(Math.imul(t2, C2_128), 16), C3_128)) >>> 0;
	h3 = (h3 ^ Math.imul(rotl32(Math.imul(t3, C3_128), 17), C4_128)) >>> 0;
	h4 = (h4 ^ Math.imul(rotl32(Math.imul(t4, C4_128), 18), C1_128)) >>> 0;

	h1 = (h1 ^ length) >>> 0;
	h2 = (h2 ^ length) >>> 0;
	h3 = (h3 ^ length) >>> 0;
	h4 = (h4 ^ length) >>> 0;

	h1 = (h1 + h2 + h3 + h4) >>> 0;
	h2 = (h2 + h1) >>> 0;
	h3 = (h3 + h1) >>> 0;
	h4 = (h4 + h1) >>> 0;

	h1 = fmix32(h1);
	h2 = fmix32(h2);
	h3 = fmix32(h3);
	h4 = fmix32(h4);

	h1 = (h1 + h2 + h3 + h4) >>> 0;
	h2 = (h2 + h1) >>> 0;
	h3 = (h3 + h1) >>> 0;
	h4 = (h4 + h1) >>> 0;

	const digest = new Uint8Array(16);
	setUint32Le(digest, 0, h1);
	setUint32Le(digest, 4, h2);
	setUint32Le(digest, 8, h3);
	setUint32Le(digest, 12, h4);
	return digest;
}
