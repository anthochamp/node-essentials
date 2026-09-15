/**
 * The RIPEMD-160 compression function (Dobbertin, Bosselaers & Preneel,
 * "RIPEMD-160, a strengthened version of RIPEMD"). Merkle–Damgård, same 64-byte
 * little-endian-word block/padding as MD5, but its round function runs **two
 * independent 80-step lines** (left/right) over the same block with different
 * message-word permutations, rotation amounts, round constants, and
 * boolean-function order, combining the two lines' output into the running
 * state at the end of each block.
 *
 * Legacy: RIPEMD-160 is not broken the way MD5/SHA-1 are, but is superseded by
 * SHA-2/SHA-3/BLAKE2 for new designs; implemented only for interop with
 * existing formats that still specify it.
 *
 * Tables transcribed verbatim from the reference pseudocode published at
 * [https://homes.esat.kuleuven.be/~bosselae/ripemd/rmd160.txt](https://homes.esat.kuleuven.be/~bosselae/ripemd/rmd160.txt)
 * (the algorithm's own authors' site) — this hash function has no simple
 * per-index formula for its message-word/rotation tables the way, e.g., SHA-1's
 * round constants or MD5's sine-derived `T` table do; there's no recurrence to
 * compute them from instead.
 */

import { getUint32Le, rotl32 } from "@ac-kit/core";

/** Same numeric values as SHA-1's IV. */
export const RIPEMD160_IV = [
	0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0,
] as const;

/** One constant per 16-round group, left line. */
const K_LEFT = [
	0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e,
] as const;

/** One constant per 16-round group, right line. */
const K_RIGHT = [
	0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000,
] as const;

/** The 5 boolean functions, one per 16-round group (shared by both lines). */
const BOOLEAN_FUNCTIONS: readonly ((
	x: number,
	y: number,
	z: number,
) => number)[] = [
	(x, y, z) => x ^ y ^ z,
	(x, y, z) => (x & y) | (~x & z),
	(x, y, z) => (x | ~y) ^ z,
	(x, y, z) => (x & z) | (y & ~z),
	(x, y, z) => x ^ (y | ~z),
];

// prettier-ignore
const R_LEFT = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
	7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
	3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
	1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
	4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13,
] as const;

// prettier-ignore
const R_RIGHT = [
	5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
	6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
	15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
	8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
	12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11,
] as const;

// prettier-ignore
const S_LEFT = [
	11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
	7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
	11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
	11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
	9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6,
] as const;

// prettier-ignore
const S_RIGHT = [
	8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
	9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
	9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
	15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
	8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11,
] as const;

/** Compresses one 64-byte block starting at `offset` into `state`, in place. */
export function ripemd160ProcessBlock(
	state: Uint32Array,
	block: Uint8Array,
	offset: number,
): void {
	const x = new Uint32Array(16);

	for (let t = 0; t < 16; t++) {
		x[t] = getUint32Le(block, offset + t * 4);
	}

	let a = state[0]!;
	let b = state[1]!;
	let c = state[2]!;
	let d = state[3]!;
	let e = state[4]!;
	let aPrime = state[0]!;
	let bPrime = state[1]!;
	let cPrime = state[2]!;
	let dPrime = state[3]!;
	let ePrime = state[4]!;

	for (let round = 0; round < 80; round++) {
		const group = Math.floor(round / 16);
		const leftF = BOOLEAN_FUNCTIONS[group]!;
		const rightF = BOOLEAN_FUNCTIONS[4 - group]!;

		const t = rotl32(
			(a + leftF(b, c, d) + x[R_LEFT[round]!]! + K_LEFT[group]!) >>> 0,
			S_LEFT[round]!,
		);
		const combinedT = (t + e) >>> 0;

		a = e;
		e = d;
		d = rotl32(c, 10);
		c = b;
		b = combinedT;

		const tPrime = rotl32(
			(aPrime +
				rightF(bPrime, cPrime, dPrime) +
				x[R_RIGHT[round]!]! +
				K_RIGHT[group]!) >>>
				0,
			S_RIGHT[round]!,
		);
		const combinedTPrime = (tPrime + ePrime) >>> 0;

		aPrime = ePrime;
		ePrime = dPrime;
		dPrime = rotl32(cPrime, 10);
		cPrime = bPrime;
		bPrime = combinedTPrime;
	}

	const combined = (state[1]! + c + dPrime) >>> 0;

	state[1] = (state[2]! + d + ePrime) >>> 0;
	state[2] = (state[3]! + e + aPrime) >>> 0;
	state[3] = (state[4]! + a + bPrime) >>> 0;
	state[4] = (state[0]! + b + cPrime) >>> 0;
	state[0] = combined;
}
