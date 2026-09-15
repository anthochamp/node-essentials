import { MASK_32N } from "@ac-kit/core";

import { IeeeFormat } from "../ieee-format.js";
import { encodeExpSign } from "./_encode-exp-sign.js";
import { trailingWidth } from "./_trailing-width.js";

/**
 * Encode `sign`, `biasedExp`, and `trailSig` into `words`.
 *
 * The array is zeroed first, then all three fields are written.
 *
 * @param biasedExp - Biased exponent as a JS number (fits in 15 bits max).
 * @param trailSig - Trailing significand as a bigint (`t` bits).
 */
export function encodeFromBigInt(
	words: Uint32Array,
	format: IeeeFormat,
	sign: 0 | 1,
	biasedExp: number,
	trailSig: bigint,
): void {
	words.fill(0);
	const t = trailingWidth(format);

	// Trailing significand: bits 0 .. t-1 (word-at-a-time for speed)
	const nFullWords = t >>> 5;
	const remainBits = t & 31;
	let s = trailSig;
	for (let wi = 0; wi < nFullWords; wi++) {
		words[wi] = Number(s & MASK_32N);
		s >>= 32n;
	}
	if (remainBits > 0) {
		words[nFullWords] = Number(s & BigInt((1 << remainBits) - 1));
	}

	encodeExpSign(words, format, sign, biasedExp);
}
