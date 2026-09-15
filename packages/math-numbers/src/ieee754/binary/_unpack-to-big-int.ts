import { bigIntBitLength } from "@ac-kit/core";

import { IeeeFormat, ieeeEMin } from "../ieee-format.js";
import { allOnesExp } from "./_all-ones-exp.js";
import { exponentBias } from "./_bias.js";
import { getBiasedExp } from "./_get-biased-exp.js";
import { getSign } from "./_get-sign.js";
import { getTrailingSigBigInt } from "./_get-trailing-sig-big-int.js";
import { trailingWidth } from "./_trailing-width.js";
import {
	IeeeBinary,
	IeeeBinaryInf,
	IeeeBinaryNaN,
} from "./ieee-binary-types.js";

/**
 * Decode a packed IEEE 754 bit pattern into a `IeeeBinaryUnpacked<bigint>`
 * value \u2014 the portable JS kernel's own unpack. See {@link sfUnpackLimbs}
 * for the WASM kernel's limb-native equivalent.
 *
 * Unpacked normal convention: value = (−1)^sign × sig × 2^(exp − (p − 1)) where
 * sig is a p-bit integer (2^(p-1) ≤ sig < 2^p).
 *
 * Subnormals are converted to pseudo-normal form: - `sig` is shifted left until
 * its leading bit is at position `p − 1` - `exp` is reduced by the same amount
 * (relative to `emin`)
 *
 * References:
 *
 * - IEEE 754-2019 §3.4 (binary formats)
 * - Patterson & Hennessy, App. J (software floating-point)
 */
export function unpackToBigInt(
	words: Uint32Array,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	const sign = getSign(words, format);
	const biasedExp = getBiasedExp(words, format);
	const trailSig = getTrailingSigBigInt(words, format);
	const allOnes = allOnesExp(format);
	const t = trailingWidth(format);

	if (biasedExp === allOnes) {
		// NaN or Infinity
		return trailSig === 0n
			? ({ kind: "inf", sign } satisfies IeeeBinaryInf)
			: ({ kind: "nan", payload: trailSig } satisfies IeeeBinaryNaN);
	}

	if (biasedExp === 0) {
		// Zero or subnormal
		if (trailSig === 0n) return { kind: "zero", sign };

		// Subnormal: value = trailSig × 2^emin / 2^t
		// Normalize to pseudo-normal (shift left until leading bit is at t)
		const emin = ieeeEMin(format);
		const leadPos = bigIntBitLength(trailSig) - 1; // position of leading 1
		const shift = t - leadPos; // bring leading 1 to position t
		const sig = trailSig << BigInt(shift);
		const exp = emin - shift;
		return { kind: "finite", sign, exp, sig };
	}

	// Normal: restore implicit leading 1 at bit t
	const sig = (1n << BigInt(t)) | trailSig;
	const exp = biasedExp - exponentBias(format);
	return { kind: "finite", sign, exp, sig };
}
