import { wordsForBits } from "@ac-kit/core";
import {
	limb32GuardBit,
	limb32Increment,
	limb32ShiftRightTrunc,
	limb32StickyBelow,
} from "@ac-kit/math-integer";

import { IeeeFormat } from "../ieee-format.js";
import { allOnesExp } from "./_all-ones-exp.js";
import { exponentBias } from "./_bias.js";
import { encodeFromBigInt } from "./_encode-big-int.js";
import { encodeFromLimbs } from "./_encode-limbs.js";
import { trailingWidth } from "./_trailing-width.js";
import { IeeeBinary } from "./ieee-binary-types.js";

/**
 * Same as {@link sfPack}, but for `IeeeBinaryUnpacked<Uint32Array>` - the WASM
 * kernel's native limb-encoded significand. Identical algorithm, no `bigint`
 * anywhere: shifting/rounding is done word-at-a-time (see `limb-bits.ts`).
 */
export function packFromLimbs(
	sf: IeeeBinary<Uint32Array>,
	format: IeeeFormat,
): Uint32Array {
	const words = new Uint32Array(wordsForBits(format.k, 32));

	const t = trailingWidth(format);
	const allOnes = allOnesExp(format);
	const bias = exponentBias(format);
	const limbWords = wordsForBits(format.p, 32);

	switch (sf.kind) {
		case "zero":
			encodeFromLimbs(words, format, sf.sign, 0, new Uint32Array(limbWords));
			break;

		case "inf":
			encodeFromLimbs(
				words,
				format,
				sf.sign,
				allOnes,
				new Uint32Array(limbWords),
			);
			break;

		case "nan": {
			// NaN payloads are rare and not perf-critical — keep them on bigint.
			const qBit = 1n << BigInt(t - 1);
			const payload = sf.payload === 0n ? qBit : sf.payload | qBit;
			encodeFromBigInt(words, format, 0, allOnes, payload);
			break;
		}

		case "finite": {
			const biasedExp = sf.exp + bias;

			if (biasedExp >= 1) {
				// Normal: same reasoning as `sfPack` — no need to clear the
				// implicit leading bit first, `sfEncodeLimbs`'s word/bit boundary
				// already excludes it. Skips an allocation per normal pack.
				encodeFromLimbs(words, format, sf.sign, biasedExp, sf.sig);
			} else {
				// Gradual underflow: round to the subnormal grid (round-to-nearest,
				// ties-to-even via guard/sticky bits — equivalent to the bigint
				// path's `discarded > half || (discarded === half && odd)` test).
				const shift = 1 - biasedExp;
				const guard = limb32GuardBit(sf.sig, shift);
				const sticky = limb32StickyBelow(sf.sig, shift);
				let subnormSig = limb32ShiftRightTrunc(sf.sig, shift);
				const resultOdd = (subnormSig[0]! & 1) === 1;

				if (guard === 1 && (sticky || resultOdd)) {
					subnormSig = limb32Increment(subnormSig);
				}

				// Rounding up out of the subnormal range lands on the smallest
				// normal, which is the correct IEEE 754 result.
				if (((subnormSig[t >>> 5]! >>> (t & 31)) & 1) === 1) {
					encodeFromLimbs(
						words,
						format,
						sf.sign,
						1,
						new Uint32Array(limbWords),
					);
				} else {
					encodeFromLimbs(words, format, sf.sign, 0, subnormSig);
				}
			}
			break;
		}
	}

	return words;
}
