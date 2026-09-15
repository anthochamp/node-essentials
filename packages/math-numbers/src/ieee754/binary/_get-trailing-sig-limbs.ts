import { wordsForBits } from "@ac-kit/core";

import { IeeeFormat } from "../ieee-format.js";
import { trailingWidth } from "./_trailing-width.js";

/**
 * Extract the trailing significand (bits `0 .. t − 1`) as a limb-encoded
 * `Uint32Array` (little-endian words, mirrors {@link sfSigLimbWords}) — the WASM
 * kernel's native significand representation. A plain word-at-a-time copy, no
 * `bigint` involved.
 */
export function getTrailingSigLimbs(
	words: Uint32Array,
	format: IeeeFormat,
): Uint32Array {
	const t = trailingWidth(format);
	const nFullWords = t >>> 5;
	const remainBits = t & 31;
	const result = new Uint32Array(wordsForBits(format.p, 32));

	for (let wi = 0; wi < nFullWords; wi++) {
		result[wi] = words[wi]!;
	}
	if (remainBits > 0) {
		result[nFullWords] = words[nFullWords]! & ((1 << remainBits) - 1);
	}

	return result;
}
