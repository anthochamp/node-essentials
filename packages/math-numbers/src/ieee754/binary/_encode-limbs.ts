import { IeeeFormat } from "../ieee-format.js";
import { encodeExpSign } from "./_encode-exp-sign.js";
import { trailingWidth } from "./_trailing-width.js";

/**
 * Same as {@link sfEncode}, but the trailing significand is already a
 * limb-encoded `Uint32Array` (mirrors {@link sfGetTrailingSigLimbs}) — no
 * `bigint` conversion, the WASM kernel's native path.
 */
export function encodeFromLimbs(
	words: Uint32Array,
	format: IeeeFormat,
	sign: 0 | 1,
	biasedExp: number,
	trailSig: Uint32Array,
): void {
	words.fill(0);
	const t = trailingWidth(format);
	const nFullWords = t >>> 5;
	const remainBits = t & 31;

	for (let wi = 0; wi < nFullWords; wi++) {
		words[wi] = trailSig[wi]!;
	}
	if (remainBits > 0) {
		words[nFullWords] = trailSig[nFullWords]! & ((1 << remainBits) - 1);
	}

	encodeExpSign(words, format, sign, biasedExp);
}
