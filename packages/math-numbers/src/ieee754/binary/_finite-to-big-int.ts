import { limb32ToBigInt } from "@ac-kit/math-integer";

import { IeeeBinaryFinite } from "./ieee-binary-types.js";

/**
 * `sf` with `sig` guaranteed to be a `bigint` \u2014 identity (no allocation)
 * if it already is. Lets a kernel accept an operand produced by the other
 * kernel instead of rejecting it.
 */
export function finiteToBigInt(sf: IeeeBinaryFinite): IeeeBinaryFinite<bigint> {
	if (typeof sf.sig === "bigint") {
		return sf as IeeeBinaryFinite<bigint>;
	}
	return { ...sf, sig: limb32ToBigInt(sf.sig) };
}
