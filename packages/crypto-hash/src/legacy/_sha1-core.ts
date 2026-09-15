/**
 * The SHA-1 compression function (FIPS 180-4 §6.1). Merkle–Damgård, same
 * 64-byte block/big-endian words/padding as the SHA-2 family, but a simpler
 * five-word state, an 80-round message schedule extended by a single XOR +
 * 1-bit rotate (not SHA-2's `sigma` mixing functions), and four round-gated
 * boolean functions instead of one fixed pair.
 *
 * Legacy: SHA-1 is cryptographically broken (practical collisions exist, e.g.
 * SHAttered) and must never be used for anything security-sensitive.
 * Implemented only for interop with existing formats that still specify it
 * (e.g. RFC 5280 key identifiers, older signatures) — never as a new design's
 * default.
 */

import { getUint32Be, rotl32 } from "@ac-kit/core";

/** FIPS 180-4 §5.3.1. */
export const SHA1_IV = [
	0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0,
] as const;

/** FIPS 180-4 §4.2.1 — one constant per 20-round group. */
const K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6] as const;

/** FIPS 180-4 §4.1.1 — one boolean function per 20-round group. */
function roundFunction(round: number, b: number, c: number, d: number): number {
	if (round < 20) {
		return (b & c) | (~b & d);
	}

	if (round < 40) {
		return b ^ c ^ d;
	}

	if (round < 60) {
		return (b & c) | (b & d) | (c & d);
	}

	return b ^ c ^ d;
}

/** Compresses one 64-byte block starting at `offset` into `state`, in place. */
export function sha1ProcessBlock(
	state: Uint32Array,
	block: Uint8Array,
	offset: number,
): void {
	// FIPS 180-4 §6.1.2 step 1: W_0..W_15 from the block, W_16..W_79 extended.
	const w = new Uint32Array(80);

	for (let t = 0; t < 16; t++) {
		w[t] = getUint32Be(block, offset + t * 4);
	}

	for (let t = 16; t < 80; t++) {
		w[t] = rotl32(w[t - 3]! ^ w[t - 8]! ^ w[t - 14]! ^ w[t - 16]!, 1);
	}

	let a = state[0]!;
	let b = state[1]!;
	let c = state[2]!;
	let d = state[3]!;
	let e = state[4]!;

	for (let round = 0; round < 80; round++) {
		const temp =
			(rotl32(a, 5) +
				roundFunction(round, b, c, d) +
				e +
				K[Math.floor(round / 20)]! +
				w[round]!) >>>
			0;

		e = d;
		d = c;
		c = rotl32(b, 30);
		b = a;
		a = temp;
	}

	state[0] = (state[0]! + a) >>> 0;
	state[1] = (state[1]! + b) >>> 0;
	state[2] = (state[2]! + c) >>> 0;
	state[3] = (state[3]! + d) >>> 0;
	state[4] = (state[4]! + e) >>> 0;
}
