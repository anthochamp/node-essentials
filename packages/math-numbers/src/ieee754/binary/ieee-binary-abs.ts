import { narrowToBigInt } from "./_narrow-to-big-int.js";
import { IeeeBinary } from "./ieee-binary-types.js";

/** `|a|`. The one implementation — not accelerated, not swappable. */
export function ieeeBinaryAbs(a: IeeeBinary): IeeeBinary<bigint> {
	const na = narrowToBigInt(a);
	if (na.kind === "nan") return na;
	return { ...na, sign: 0 };
}
