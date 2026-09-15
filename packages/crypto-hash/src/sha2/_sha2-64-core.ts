import {
	MASK_64N,
	getBigUint64Be,
	rotr64,
	setBigUint64ArrayBe,
} from "@ac-kit/core";

import { merkleDamgardPad } from "../_common/_merkle-damgard-pad.js";
import type { Sha2_64Parameters } from "./_sha2-64-params.js";

/**
 * The compression function shared by SHA-384 and SHA-512 (FIPS 180-4) — they
 * differ only in the initial hash value and in truncating the output, not in
 * the round function itself. The 64-bit word arithmetic reuses `@ac-kit/core`'s
 * `rotr64`/`MASK_64N` rather than reimplementing rotation.
 *
 * `bigint` words are used here — unlike `@ac-kit/crypto-safe`'s constant-time
 * kernel, this has no secret operand to protect from `bigint`'s variable-time
 * arithmetic: a hash compression function has no data-dependent branch or
 * memory access to begin with (every operation runs unconditionally over every
 * word), so there is no side channel for `bigint`'s variable-time
 * multiplication to open here — the concern that rules `bigint` out for modular
 * exponentiation does not apply to fixed-function bitwise mixing.
 */

const ROUND_CONSTANTS: readonly bigint[] = [
	0x428a2f98d728ae22n,
	0x7137449123ef65cdn,
	0xb5c0fbcfec4d3b2fn,
	0xe9b5dba58189dbbcn,
	0x3956c25bf348b538n,
	0x59f111f1b605d019n,
	0x923f82a4af194f9bn,
	0xab1c5ed5da6d8118n,
	0xd807aa98a3030242n,
	0x12835b0145706fben,
	0x243185be4ee4b28cn,
	0x550c7dc3d5ffb4e2n,
	0x72be5d74f27b896fn,
	0x80deb1fe3b1696b1n,
	0x9bdc06a725c71235n,
	0xc19bf174cf692694n,
	0xe49b69c19ef14ad2n,
	0xefbe4786384f25e3n,
	0x0fc19dc68b8cd5b5n,
	0x240ca1cc77ac9c65n,
	0x2de92c6f592b0275n,
	0x4a7484aa6ea6e483n,
	0x5cb0a9dcbd41fbd4n,
	0x76f988da831153b5n,
	0x983e5152ee66dfabn,
	0xa831c66d2db43210n,
	0xb00327c898fb213fn,
	0xbf597fc7beef0ee4n,
	0xc6e00bf33da88fc2n,
	0xd5a79147930aa725n,
	0x06ca6351e003826fn,
	0x142929670a0e6e70n,
	0x27b70a8546d22ffcn,
	0x2e1b21385c26c926n,
	0x4d2c6dfc5ac42aedn,
	0x53380d139d95b3dfn,
	0x650a73548baf63den,
	0x766a0abb3c77b2a8n,
	0x81c2c92e47edaee6n,
	0x92722c851482353bn,
	0xa2bfe8a14cf10364n,
	0xa81a664bbc423001n,
	0xc24b8b70d0f89791n,
	0xc76c51a30654be30n,
	0xd192e819d6ef5218n,
	0xd69906245565a910n,
	0xf40e35855771202an,
	0x106aa07032bbd1b8n,
	0x19a4c116b8d2d0c8n,
	0x1e376c085141ab53n,
	0x2748774cdf8eeb99n,
	0x34b0bcb5e19b48a8n,
	0x391c0cb3c5c95a63n,
	0x4ed8aa4ae3418acbn,
	0x5b9cca4f7763e373n,
	0x682e6ff3d6b2b8a3n,
	0x748f82ee5defb2fcn,
	0x78a5636f43172f60n,
	0x84c87814a1f0ab72n,
	0x8cc702081a6439ecn,
	0x90befffa23631e28n,
	0xa4506cebde82bde9n,
	0xbef9a3f7b2c67915n,
	0xc67178f2e372532bn,
	0xca273eceea26619cn,
	0xd186b8c721c0c207n,
	0xeada7dd6cde0eb1en,
	0xf57d4f7fee6ed178n,
	0x06f067aa72176fban,
	0x0a637dc5a2c898a6n,
	0x113f9804bef90daen,
	0x1b710b35131c471bn,
	0x28db77f523047d84n,
	0x32caab7b40c72493n,
	0x3c9ebe0a15c9bebcn,
	0x431d67c49c100d4cn,
	0x4cc5d4becb3e42b6n,
	0x597f299cfc657e2an,
	0x5fcb6fab3ad6faecn,
	0x6c44198c4a475817n,
];

/**
 * Compresses one 128-byte block starting at `offset` into `state`, in place.
 *
 * The reusable core both {@link sha2_64} (one-shot) and {@link Sha2_64Sink}
 * (incremental) are built from — see {@link sha2_32ProcessBlock}'s doc for why
 * a fresh `w` per call, not a `DataView`, is the right tradeoff at this call
 * frequency.
 */
export function sha2_64ProcessBlock(
	state: BigUint64Array,
	block: Uint8Array,
	offset: number,
): void {
	const w = new BigUint64Array(80);

	for (let t = 0; t < 16; t++) {
		w[t] = getBigUint64Be(block, offset + t * 8);
	}

	for (let t = 16; t < 80; t++) {
		const sigma0 =
			rotr64(w[t - 15]!, 1n) ^ rotr64(w[t - 15]!, 8n) ^ (w[t - 15]! >> 7n);
		const sigma1 =
			rotr64(w[t - 2]!, 19n) ^ rotr64(w[t - 2]!, 61n) ^ (w[t - 2]! >> 6n);

		w[t] = (w[t - 16]! + sigma0 + w[t - 7]! + sigma1) & MASK_64N;
	}

	let a = state[0]!;
	let b = state[1]!;
	let c = state[2]!;
	let d = state[3]!;
	let e = state[4]!;
	let f = state[5]!;
	let g = state[6]!;
	let h = state[7]!;

	for (let t = 0; t < 80; t++) {
		const bigSigma1 = rotr64(e, 14n) ^ rotr64(e, 18n) ^ rotr64(e, 41n);
		const ch = (e & f) ^ (~e & g);
		const temp1 = (h + bigSigma1 + ch + ROUND_CONSTANTS[t]! + w[t]!) & MASK_64N;
		const bigSigma0 = rotr64(a, 28n) ^ rotr64(a, 34n) ^ rotr64(a, 39n);
		const maj = (a & b) ^ (a & c) ^ (b & c);
		const temp2 = (bigSigma0 + maj) & MASK_64N;

		h = g;
		g = f;
		f = e;
		e = (d + temp1) & MASK_64N;
		d = c;
		c = b;
		b = a;
		a = (temp1 + temp2) & MASK_64N;
	}

	state[0] = (state[0]! + a) & MASK_64N;
	state[1] = (state[1]! + b) & MASK_64N;
	state[2] = (state[2]! + c) & MASK_64N;
	state[3] = (state[3]! + d) & MASK_64N;
	state[4] = (state[4]! + e) & MASK_64N;
	state[5] = (state[5]! + f) & MASK_64N;
	state[6] = (state[6]! + g) & MASK_64N;
	state[7] = (state[7]! + h) & MASK_64N;
}

/**
 * Runs the SHA-384/512 compression function over `data`, configured by
 * `params`, and returns the digest — the one-shot path every 64-bit SHA-2
 * variant (`sha384Ts`, `sha512Ts`) is a thin, named wrapper around.
 */
export function sha2_64(
	data: Uint8Array,
	params: Sha2_64Parameters,
): Uint8Array<ArrayBuffer> {
	const padded = merkleDamgardPad(data, 128, 16);
	const state = BigUint64Array.from(params.iv);

	for (let block = 0; block < padded.length; block += 128) {
		sha2_64ProcessBlock(state, padded, block);
	}

	const digest = new Uint8Array(params.outputBytes);
	setBigUint64ArrayBe(digest, 0, state, params.outputBytes);
	return digest;
}
