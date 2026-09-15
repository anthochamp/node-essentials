import { IeeeFormat } from "../ieee-format.js";
import { exponentWidth } from "./_exponent-width.js";
import { trailingWidth } from "./_trailing-width.js";

/**
 * Extract the biased exponent as a JS number.
 *
 * The exponent field occupies `w` bits starting at bit `t`. Since `w ≤ 19` for
 * all standard formats, the result always fits in a signed 32-bit integer.
 *
 * Word-at-a-time (mirrors {@link sfGetTrailingSig}): for every standard format
 * the field sits inside a single word, but a two-word read handles the
 * boundary-straddling case too, so no format is special-cased.
 */
export function getBiasedExp(words: Uint32Array, format: IeeeFormat): number {
	const t = trailingWidth(format);
	const w = exponentWidth(format);
	const startWord = t >>> 5;
	const startBit = t & 31;

	if (startBit + w <= 32) {
		return (words[startWord]! >>> startBit) & ((1 << w) - 1);
	}

	const lowBits = 32 - startBit;
	const low = words[startWord]! >>> startBit;
	const high = words[startWord + 1]! & ((1 << (w - lowBits)) - 1);
	return (low | (high << lowBits)) >>> 0;
}
