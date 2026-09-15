import { limb32FromBigInt } from "@ac-kit/math-integer";

import { IeeeBinaryFinite } from "./ieee-binary-types.js";

/**
 * `sf` with `sig` guaranteed to be a `limbWords`-length limb array \u2014
 * identity (no allocation) if it already is.
 */
export function finiteToLimbs(
	sf: IeeeBinaryFinite,
	limbWords: number,
): IeeeBinaryFinite<Uint32Array> {
	if (sf.sig instanceof Uint32Array) {
		return sf as IeeeBinaryFinite<Uint32Array>;
	}
	return { ...sf, sig: limb32FromBigInt(sf.sig, limbWords) };
}
