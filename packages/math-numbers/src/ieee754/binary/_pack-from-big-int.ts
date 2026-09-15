import { wordsForBits } from "@ac-kit/core";

import { IeeeFormat } from "../ieee-format.js";
import { allOnesExp } from "./_all-ones-exp.js";
import { exponentBias } from "./_bias.js";
import { encodeFromBigInt } from "./_encode-big-int.js";
import { trailingWidth } from "./_trailing-width.js";
import { IeeeBinary } from "./ieee-binary-types.js";

/**
 * Encode a `IeeeBinaryUnpacked<bigint>` value into a fresh `Uint32Array` bit
 * pattern. The portable JS kernel's own pack \u2014 see {@link sfPackLimbs} for
 * the WASM kernel's limb-native equivalent.
 *
 * Subnormals: if `exp` falls below `emin`, the significand is right-shifted to
 * create the stored subnormal representation (truncation — correct rounding for
 * subnormals should be handled before calling `sfPack`).
 */
export function packFromBigInt(
	sf: IeeeBinary<bigint>,
	format: IeeeFormat,
): Uint32Array {
	const words = new Uint32Array(wordsForBits(format.k, 32));
	const t = trailingWidth(format);
	const allOnes = allOnesExp(format);
	const bias = exponentBias(format);

	switch (sf.kind) {
		case "zero":
			encodeFromBigInt(words, format, sf.sign, 0, 0n);
			break;

		case "inf":
			encodeFromBigInt(words, format, sf.sign, allOnes, 0n);
			break;

		case "nan": {
			// Canonical quiet NaN: set quiet bit (bit t-1), preserve payload
			const qBit = 1n << BigInt(t - 1);
			const payload = sf.payload === 0n ? qBit : sf.payload | qBit;
			encodeFromBigInt(words, format, 0, allOnes, payload);
			break;
		}

		case "finite": {
			const biasedExp = sf.exp + bias;

			if (biasedExp >= 1) {
				// Normal: `sfEncode`'s word/bit-boundary math for the trailing field
				// (bits 0..t-1) already excludes bit t, so the implicit leading 1 in
				// `sf.sig` need not be masked off first — passing it through as-is
				// saves an allocation and is bit-for-bit identical.
				encodeFromBigInt(words, format, sf.sign, biasedExp, sf.sig);
			} else {
				// Gradual underflow: the significand loses bits, so it has to be
				// rounded to the subnormal grid rather than truncated onto it.
				const shift = BigInt(1 - biasedExp);
				const discarded = sf.sig & ((1n << shift) - 1n);
				const half = 1n << (shift - 1n);
				let subnormSig = sf.sig >> shift;

				if (
					discarded > half ||
					(discarded === half && (subnormSig & 1n) === 1n)
				) {
					subnormSig += 1n;
				}

				// Rounding up out of the subnormal range lands on the smallest
				// normal, which is the correct IEEE 754 result.
				if (subnormSig >= 1n << BigInt(t)) {
					encodeFromBigInt(words, format, sf.sign, 1, 0n);
				} else {
					encodeFromBigInt(words, format, sf.sign, 0, subnormSig);
				}
			}
			break;
		}
	}

	return words;
}
