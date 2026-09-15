import { MASK_32, MASK_32N, getUint32Le, rotr32 } from "@ac-kit/core";

import { BLAKE2_SIGMA } from "./_blake2-sigma.js";

/**
 * BLAKE2s (RFC 7693) — the 32-bit-word member of the BLAKE2 family, using
 * 64-byte blocks and 10 rounds per compression. Words are read/written
 * little-endian (unlike this package's SHA-2/SM3/Keccak members), per RFC 7693
 * §2.4.
 */

/** RFC 7693 §2.6 — coincides numerically with SHA-256's IV (§2.6 note). */
export const BLAKE2S_IV: readonly number[] = [
	0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
	0x1f83d9ab, 0x5be0cd19,
];

/** RFC 7693 §2.1 — BLAKE2s's block size in bytes. */
export const BLAKE2S_BLOCK_SIZE_BYTES = 64;

/** RFC 7693 §3.1 — mixes `x`/`y` into the four lanes `a`,`b`,`c`,`d` of `v`. */
function g(
	v: Uint32Array,
	a: number,
	b: number,
	c: number,
	d: number,
	x: number,
	y: number,
): void {
	v[a] = (v[a]! + v[b]! + x) >>> 0;
	v[d] = rotr32(v[d]! ^ v[a]!, 16);
	v[c] = (v[c]! + v[d]!) >>> 0;
	v[b] = rotr32(v[b]! ^ v[c]!, 12);
	v[a] = (v[a]! + v[b]! + y) >>> 0;
	v[d] = rotr32(v[d]! ^ v[a]!, 8);
	v[c] = (v[c]! + v[d]!) >>> 0;
	v[b] = rotr32(v[b]! ^ v[c]!, 7);
}

/**
 * Compresses one 64-byte block starting at `offset` into `state`, in place (RFC
 * 7693 §3.2).
 *
 * @param byteCounter `t` — the total message bytes hashed so far, including
 *   this block.
 * @param isLast `f` — whether this is the final block.
 */
export function blake2sCompress(
	state: Uint32Array,
	block: Uint8Array,
	offset: number,
	byteCounter: bigint,
	isLast: boolean,
): void {
	const m = new Uint32Array(16);

	for (let t = 0; t < 16; t++) {
		m[t] = getUint32Le(block, offset + t * 4);
	}

	const v = new Uint32Array(16);

	for (let i = 0; i < 8; i++) {
		v[i] = state[i]!;
		v[i + 8] = BLAKE2S_IV[i]!;
	}

	v[12] = (v[12]! ^ Number(byteCounter & MASK_32N)) >>> 0;
	v[13] = (v[13]! ^ Number((byteCounter >> 32n) & MASK_32N)) >>> 0;

	if (isLast) {
		v[14] = (v[14]! ^ MASK_32) >>> 0;
	}

	for (let round = 0; round < 10; round++) {
		const s = BLAKE2_SIGMA[round]!;

		g(v, 0, 4, 8, 12, m[s[0]!]!, m[s[1]!]!);
		g(v, 1, 5, 9, 13, m[s[2]!]!, m[s[3]!]!);
		g(v, 2, 6, 10, 14, m[s[4]!]!, m[s[5]!]!);
		g(v, 3, 7, 11, 15, m[s[6]!]!, m[s[7]!]!);
		g(v, 0, 5, 10, 15, m[s[8]!]!, m[s[9]!]!);
		g(v, 1, 6, 11, 12, m[s[10]!]!, m[s[11]!]!);
		g(v, 2, 7, 8, 13, m[s[12]!]!, m[s[13]!]!);
		g(v, 3, 4, 9, 14, m[s[14]!]!, m[s[15]!]!);
	}

	for (let i = 0; i < 8; i++) {
		state[i] = (state[i]! ^ v[i]! ^ v[i + 8]!) >>> 0;
	}
}
