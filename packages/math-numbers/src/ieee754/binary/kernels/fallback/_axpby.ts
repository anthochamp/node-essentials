import { IeeeFormat } from "../../../ieee-format.js";
import { ieeeBinaryAdd } from "../../ieee-binary-add.js";
import { IeeeBinary } from "../../ieee-binary-types.js";
import { mul } from "./_mul.js";

/**
 * `a × x + b × y` (BLAS-style AXPBY). Composed from two `mul`s then
 * `ieeeBinaryAdd` — three roundings, not a single fused one.
 */
export function axpby(
	a: IeeeBinary,
	x: IeeeBinary,
	b: IeeeBinary,
	y: IeeeBinary,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	return ieeeBinaryAdd(mul(a, x, format), mul(b, y, format), format);
}
