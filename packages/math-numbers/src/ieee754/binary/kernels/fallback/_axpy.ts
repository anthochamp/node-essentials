import { IeeeFormat } from "../../../ieee-format.js";
import { ieeeBinaryAdd } from "../../ieee-binary-add.js";
import { IeeeBinary } from "../../ieee-binary-types.js";
import { mul } from "./_mul.js";

/**
 * `a × x + y` (BLAS-style AXPY). Composed from `mul` then `ieeeBinaryAdd` — two
 * roundings, not a single fused one.
 */
export function axpy(
	a: IeeeBinary,
	x: IeeeBinary,
	y: IeeeBinary,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	return ieeeBinaryAdd(mul(a, x, format), y, format);
}
