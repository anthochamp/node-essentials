import { IeeeFormat } from "../ieee-format.js";
import { ieeeBinaryAdd } from "./ieee-binary-add.js";
import { ieeeBinaryNeg } from "./ieee-binary-neg.js";
import { IeeeBinary } from "./ieee-binary-types.js";

/** `a − b`. The one implementation — not accelerated, not swappable. */
export function ieeeBinarySub(
	a: IeeeBinary,
	b: IeeeBinary,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	return ieeeBinaryAdd(a, ieeeBinaryNeg(b), format);
}
