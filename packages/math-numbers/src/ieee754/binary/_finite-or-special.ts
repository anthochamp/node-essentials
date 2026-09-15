import { ieeeEMin, IeeeFormat } from "../ieee-format.js";
import { IeeeBinary } from "./ieee-binary-types.js";

/**
 * Convert a normalised `(sig, exp)` pair to a `IeeeBinaryUnpacked`, checking
 * for overflow (→ Infinity) and underflow (→ Zero).
 */
export function finiteOrSpecial(
	sig: bigint,
	exp: number,
	sign: 0 | 1,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	if (sig === 0n) return { kind: "zero", sign };
	if (exp > format.emax) return { kind: "inf", sign };
	// Deep underflow below the smallest subnormal: flush to zero
	const emin = ieeeEMin(format);
	if (exp < emin - (format.p - 1)) return { kind: "zero", sign };
	return { kind: "finite", sign, exp, sig };
}
