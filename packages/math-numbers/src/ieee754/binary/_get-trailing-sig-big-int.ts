import { IeeeFormat } from "../ieee-format.js";
import { trailingWidth } from "./_trailing-width.js";

/**
 * Extract the trailing significand (bits `0 .. t − 1`) as a `bigint`.
 *
 * Uses word-at-a-time reads for efficiency (avoids individual bit loops for the
 * 112-bit trailing significand of binary128).
 */
export function getTrailingSigBigInt(
	words: Uint32Array,
	format: IeeeFormat,
): bigint {
	const t = trailingWidth(format);
	const nFullWords = t >>> 5; // complete 32-bit word count
	const remainBits = t & 31; // bits in the partial top word

	let sig = 0n;

	// Lowest full word at position 0, OR it in at the right offset
	for (let wi = 0; wi < nFullWords; wi++) {
		sig |= BigInt(words[wi]!) << BigInt(wi * 32);
	}

	// Partial word (upper bits of the last field word, masked)
	if (remainBits > 0) {
		const partial = words[nFullWords]! & ((1 << remainBits) - 1);
		sig |= BigInt(partial) << BigInt(nFullWords * 32);
	}

	return sig;
}
