import { negSign } from "../common/_neg-sign.js";
import { narrowToBigInt } from "./_narrow-to-big-int.js";
import { IeeeBinary } from "./ieee-binary-types.js";

/** `−a`. The one implementation — not accelerated, not swappable. */
export function ieeeBinaryNeg(a: IeeeBinary): IeeeBinary<bigint> {
	const na = narrowToBigInt(a);
	if (na.kind === "nan") return na;
	return { ...na, sign: negSign(na.sign) };
}
