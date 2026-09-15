/**
 * The compression function shared by SHA-224 and SHA-256 (FIPS 180-4) — they
 * differ only in the initial hash value and in truncating the last output word,
 * not in the round function itself.
 *
 * Plain `number` throughout, kept in unsigned-32-bit range via `>>> 0` after
 * every operation that could overflow it: addition and left rotation. This is
 * not the secret-dependent, constant-time-sensitive arithmetic `math/numbers`'
 * constant-time kernel exists for — a hash function has no secret operand, only
 * a secret _result_ to protect via the digest itself — so plain `number`
 * arithmetic is the right tool here, not `BigUint64Array` limbs.
 */

import { getUint32Be, rotr32, setUint32ArrayBe } from "@ac-kit/core";

import { merkleDamgardPad } from "../_common/_merkle-damgard-pad.js";
import type { Sha2_32Parameters } from "./_sha2-32-params.js";

const ROUND_CONSTANTS: readonly number[] = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
	0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
	0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
	0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
	0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
	0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
	0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
	0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
	0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/**
 * Compresses one 64-byte block starting at `offset` into `state`, in place.
 *
 * The reusable core both {@link sha2_32} (one-shot: the whole padded message,
 * one block at a time) and {@link Sha2_32Sink} (incremental: one block per
 * call, as they accumulate across `write()`s, with no full-message buffer) are
 * built from. Reads via `getUint32Be` rather than a `DataView`: measured at
 * ~14x the cost per call for a freshly constructed `DataView` versus one reused
 * across calls or a manual read — real, but a call is made once per _block_
 * here (once per 64 bytes), not once per _hash_, so a fresh view per call would
 * be paid millions of times over a large file.
 */
export function sha2_32ProcessBlock(
	state: Uint32Array,
	block: Uint8Array,
	offset: number,
): void {
	const w = new Uint32Array(64);

	for (let t = 0; t < 16; t++) {
		w[t] = getUint32Be(block, offset + t * 4);
	}

	for (let t = 16; t < 64; t++) {
		const sigma0 =
			rotr32(w[t - 15]!, 7) ^ rotr32(w[t - 15]!, 18) ^ (w[t - 15]! >>> 3);
		const sigma1 =
			rotr32(w[t - 2]!, 17) ^ rotr32(w[t - 2]!, 19) ^ (w[t - 2]! >>> 10);

		w[t] = (w[t - 16]! + sigma0 + w[t - 7]! + sigma1) >>> 0;
	}

	let a = state[0]!;
	let b = state[1]!;
	let c = state[2]!;
	let d = state[3]!;
	let e = state[4]!;
	let f = state[5]!;
	let g = state[6]!;
	let h = state[7]!;

	for (let t = 0; t < 64; t++) {
		const bigSigma1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
		const ch = (e & f) ^ (~e & g);
		const temp1 = (h + bigSigma1 + ch + ROUND_CONSTANTS[t]! + w[t]!) >>> 0;
		const bigSigma0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
		const maj = (a & b) ^ (a & c) ^ (b & c);
		const temp2 = (bigSigma0 + maj) >>> 0;

		h = g;
		g = f;
		f = e;
		e = (d + temp1) >>> 0;
		d = c;
		c = b;
		b = a;
		a = (temp1 + temp2) >>> 0;
	}

	state[0] = (state[0]! + a) >>> 0;
	state[1] = (state[1]! + b) >>> 0;
	state[2] = (state[2]! + c) >>> 0;
	state[3] = (state[3]! + d) >>> 0;
	state[4] = (state[4]! + e) >>> 0;
	state[5] = (state[5]! + f) >>> 0;
	state[6] = (state[6]! + g) >>> 0;
	state[7] = (state[7]! + h) >>> 0;
}

/**
 * Runs the SHA-224/256 compression function over `data`, configured by
 * `params`, and returns the digest — the one-shot path every 32-bit SHA-2
 * variant (`sha224`, `sha256Ts`) is a thin, named wrapper around.
 */
export function sha2_32(
	data: Uint8Array,
	params: Sha2_32Parameters,
): Uint8Array<ArrayBuffer> {
	const padded = merkleDamgardPad(data, 64, 8);
	const state = Uint32Array.from(params.iv);

	for (let block = 0; block < padded.length; block += 64) {
		sha2_32ProcessBlock(state, padded, block);
	}

	const digest = new Uint8Array(params.outputBytes);
	setUint32ArrayBe(digest, 0, state, params.outputBytes);
	return digest;
}
