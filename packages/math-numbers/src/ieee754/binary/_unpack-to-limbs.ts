import {
	limb32BitLength,
	limb32IsZero,
	limb32ShiftLeft,
	limb32ToBigInt,
} from "@ac-kit/math-integer";

import { IeeeFormat, ieeeEMin } from "../ieee-format.js";
import { allOnesExp } from "./_all-ones-exp.js";
import { exponentBias } from "./_bias.js";
import { getBiasedExp } from "./_get-biased-exp.js";
import { getSign } from "./_get-sign.js";
import { getTrailingSigLimbs } from "./_get-trailing-sig-limbs.js";
import { trailingWidth } from "./_trailing-width.js";
import {
	IeeeBinary,
	IeeeBinaryInf,
	IeeeBinaryNaN,
} from "./ieee-binary-types.js";

/**
 * Same as {@link sfUnpack}, but produces `IeeeBinaryUnpacked<Uint32Array>`
 * \u2014 the WASM kernel's native limb-encoded significand. Identical
 * algorithm, no `bigint` anywhere (NaN payloads excepted \u2014 rare, not
 * perf-critical, kept on `bigint`).
 */
export function unpackToLimbs(
	words: Uint32Array,
	format: IeeeFormat,
): IeeeBinary<Uint32Array> {
	const sign = getSign(words, format);
	const biasedExp = getBiasedExp(words, format);
	const allOnes = allOnesExp(format);
	const t = trailingWidth(format);

	if (biasedExp === allOnes) {
		const trailSig = getTrailingSigLimbs(words, format);
		return limb32IsZero(trailSig)
			? ({ kind: "inf", sign } satisfies IeeeBinaryInf)
			: ({
					kind: "nan",
					payload: limb32ToBigInt(trailSig),
				} satisfies IeeeBinaryNaN);
	}

	if (biasedExp === 0) {
		const trailSig = getTrailingSigLimbs(words, format);
		if (limb32IsZero(trailSig)) return { kind: "zero", sign };

		const emin = ieeeEMin(format);
		const leadPos = limb32BitLength(trailSig) - 1;
		const shift = t - leadPos;
		const sig = limb32ShiftLeft(trailSig, shift);
		const exp = emin - shift;
		return { kind: "finite", sign, exp, sig };
	}

	// Normal: restore implicit leading 1 at bit t
	const sig = getTrailingSigLimbs(words, format);
	sig[t >>> 5] = (sig[t >>> 5]! | (1 << (t & 31))) >>> 0;
	const exp = biasedExp - exponentBias(format);
	return { kind: "finite", sign, exp, sig };
}
