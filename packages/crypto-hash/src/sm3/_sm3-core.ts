/**
 * The SM3 compression function (GM/T 0004-2012 / GB/T 32905-2016, described in
 * English in draft-oscca-cfrg-sm3). Structurally a Merkle–Damgård hash close to
 * SHA-256 — same 64-byte block, same big-endian 32-bit words, same padding —
 * but with a wider message expansion (68 + 64 words, not 64), a two-branch
 * boolean function pair `FF_j`/`GG_j` gated on round number, and a compression
 * update that XORs the block's output into the running state rather than
 * mod-2^32 adding it (GB/T 32905-2016 §5.3.3).
 *
 * Plain `number` throughout, kept in unsigned-32-bit range via `>>> 0` — see
 * `_sha2-32-core.ts`'s doc for why this, not `@ac-kit/crypto-safe`'s
 * constant-time kernel, is the right tool for a hash compression function with
 * no secret operand.
 */

import { getUint32Be, rotl32 } from "@ac-kit/core";

/** GB/T 32905-2016 §4.1. */
export const SM3_IV = [
	0x7380166f, 0x4914b2b9, 0x172442d7, 0xda8a0600, 0xa96f30bc, 0x163138aa,
	0xe38dee4d, 0xb0fb0e4e,
] as const;

/** GB/T 32905-2016 §4.2 — selected by round number, not a per-round table. */
const T_LOW = 0x79cc4519;
const T_HIGH = 0x7a879d8a;

function ff(round: number, x: number, y: number, z: number): number {
	return round < 16 ? x ^ y ^ z : (x & y) | (x & z) | (y & z);
}

function gg(round: number, x: number, y: number, z: number): number {
	return round < 16 ? x ^ y ^ z : (x & y) | (~x & z);
}

/** GB/T 32905-2016 §4.4 — `P_0`, the compression function's own permutation. */
function p0(x: number): number {
	return x ^ rotl32(x, 9) ^ rotl32(x, 17);
}

/** GB/T 32905-2016 §4.4 — `P_1`, the message expansion's permutation. */
function p1(x: number): number {
	return x ^ rotl32(x, 15) ^ rotl32(x, 23);
}

/**
 * Compresses one 64-byte block starting at `offset` into `state`, in place —
 * see `sha2_32ProcessBlock`'s doc for why a fresh `w` per call, not a
 * `DataView`, is the right tradeoff at this call frequency.
 */
export function sm3ProcessBlock(
	state: Uint32Array,
	block: Uint8Array,
	offset: number,
): void {
	// GB/T 32905-2016 §5.3.2: W_0..W_67 expand the 16-word block; W'_j (used
	// once each, immediately) is computed inline as w[j] ^ w[j + 4] rather than
	// stored in its own array.
	const w = new Uint32Array(68);

	for (let t = 0; t < 16; t++) {
		w[t] = getUint32Be(block, offset + t * 4);
	}

	for (let t = 16; t < 68; t++) {
		w[t] =
			(p1(w[t - 16]! ^ w[t - 9]! ^ rotl32(w[t - 3]!, 15)) ^
				rotl32(w[t - 13]!, 7) ^
				w[t - 6]!) >>>
			0;
	}

	let a = state[0]!;
	let b = state[1]!;
	let c = state[2]!;
	let d = state[3]!;
	let e = state[4]!;
	let f = state[5]!;
	let g = state[6]!;
	let h = state[7]!;

	for (let round = 0; round < 64; round++) {
		const tj = rotl32(round < 16 ? T_LOW : T_HIGH, round % 32);
		const ss1 = rotl32((rotl32(a, 12) + e + tj) >>> 0, 7);
		const ss2 = ss1 ^ rotl32(a, 12);
		const wp = w[round]! ^ w[round + 4]!;
		const tt1 = (ff(round, a, b, c) + d + ss2 + wp) >>> 0;
		const tt2 = (gg(round, e, f, g) + h + ss1 + w[round]!) >>> 0;

		d = c;
		c = rotl32(b, 9);
		b = a;
		a = tt1;
		h = g;
		g = rotl32(f, 19);
		f = e;
		e = p0(tt2);
	}

	// GB/T 32905-2016 §5.3.3: XORs the block's output into the running state —
	// unlike SHA-2, which adds it mod 2^32.
	state[0] = state[0]! ^ a;
	state[1] = state[1]! ^ b;
	state[2] = state[2]! ^ c;
	state[3] = state[3]! ^ d;
	state[4] = state[4]! ^ e;
	state[5] = state[5]! ^ f;
	state[6] = state[6]! ^ g;
	state[7] = state[7]! ^ h;
}
