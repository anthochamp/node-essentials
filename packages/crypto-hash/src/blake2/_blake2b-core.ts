import { MASK_64N, getBigUint64Le, rotr64 } from "@ac-kit/core";

import { BLAKE2_SIGMA } from "./_blake2-sigma.js";

/**
 * BLAKE2b (RFC 7693) — the 64-bit-word member of the BLAKE2 family, using
 * 128-byte blocks and 12 rounds per compression. Words are read/written
 * little-endian (unlike this package's SHA-2/SM3/Keccak members), per RFC 7693
 * §2.4.
 */

/** RFC 7693 §2.6 — coincides numerically with SHA-512's IV (§2.6 note). */
export const BLAKE2B_IV: readonly bigint[] = [
	0x6a09e667f3bcc908n,
	0xbb67ae8584caa73bn,
	0x3c6ef372fe94f82bn,
	0xa54ff53a5f1d36f1n,
	0x510e527fade682d1n,
	0x9b05688c2b3e6c1fn,
	0x1f83d9abfb41bd6bn,
	0x5be0cd19137e2179n,
];

/** RFC 7693 §2.1 — BLAKE2b's block size in bytes. */
export const BLAKE2B_BLOCK_SIZE_BYTES = 128;

/** RFC 7693 §3.1 — mixes `x`/`y` into the four lanes `a`,`b`,`c`,`d` of `v`. */
function g(
	v: BigUint64Array,
	a: number,
	b: number,
	c: number,
	d: number,
	x: bigint,
	y: bigint,
): void {
	v[a] = (v[a]! + v[b]! + x) & MASK_64N;
	v[d] = rotr64(v[d]! ^ v[a]!, 32n);
	v[c] = (v[c]! + v[d]!) & MASK_64N;
	v[b] = rotr64(v[b]! ^ v[c]!, 24n);
	v[a] = (v[a]! + v[b]! + y) & MASK_64N;
	v[d] = rotr64(v[d]! ^ v[a]!, 16n);
	v[c] = (v[c]! + v[d]!) & MASK_64N;
	v[b] = rotr64(v[b]! ^ v[c]!, 63n);
}

/**
 * Compresses one 128-byte block starting at `offset` into `state`, in place
 * (RFC 7693 §3.2).
 *
 * @param byteCounter `t` — the total message bytes hashed so far, including
 *   this block.
 * @param isLast `f` — whether this is the final block.
 */
export function blake2bCompress(
	state: BigUint64Array,
	block: Uint8Array,
	offset: number,
	byteCounter: bigint,
	isLast: boolean,
): void {
	const m = new BigUint64Array(16);

	for (let t = 0; t < 16; t++) {
		m[t] = getBigUint64Le(block, offset + t * 8);
	}

	const v = new BigUint64Array(16);

	for (let i = 0; i < 8; i++) {
		v[i] = state[i]!;
		v[i + 8] = BLAKE2B_IV[i]!;
	}

	v[12] = v[12]! ^ (byteCounter & MASK_64N);
	v[13] = v[13]! ^ ((byteCounter >> 64n) & MASK_64N);

	if (isLast) {
		v[14] = v[14]! ^ MASK_64N;
	}

	for (let round = 0; round < 12; round++) {
		const s = BLAKE2_SIGMA[round % 10]!;

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
		state[i] = state[i]! ^ v[i]! ^ v[i + 8]!;
	}
}
