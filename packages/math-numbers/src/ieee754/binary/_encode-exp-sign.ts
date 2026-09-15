import { IeeeFormat } from "../ieee-format.js";
import { exponentWidth } from "./_exponent-width.js";
import { trailingWidth } from "./_trailing-width.js";

/**
 * Write `biasedExp` and `sign` into `words` — the part of encoding that is
 * identical regardless of whether the trailing significand came from a `bigint`
 * or a limb array. Shared by {@link sfEncode} and {@link sfEncodeLimbs}.
 *
 * Callers zero `words` and write the trailing significand first; this only ORs
 * in bits, it does not clear them.
 */
export function encodeExpSign(
	words: Uint32Array,
	format: IeeeFormat,
	sign: 0 | 1,
	biasedExp: number,
): void {
	const t = trailingWidth(format);
	const w = exponentWidth(format);
	const startWord = t >>> 5;
	const startBit = t & 31;

	if (startBit + w <= 32) {
		words[startWord] =
			(words[startWord]! | ((biasedExp & ((1 << w) - 1)) << startBit)) >>> 0;
	} else {
		const lowBits = 32 - startBit;
		words[startWord] = (words[startWord]! | (biasedExp << startBit)) >>> 0;
		words[startWord + 1] =
			(words[startWord + 1]! | (biasedExp >>> lowBits)) >>> 0;
	}

	const signPos = format.k - 1;
	const signWord = signPos >>> 5;
	const signBit = signPos & 31;
	words[signWord] =
		((words[signWord]! & ~(1 << signBit)) | (sign << signBit)) >>> 0;
}
