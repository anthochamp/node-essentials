import { IeeeFormat } from "../../../ieee-format.js";
import { finiteOrSpecial } from "../../_finite-or-special.js";
import { narrowToBigInt } from "../../_narrow-to-big-int.js";
import { normalizeSignificand } from "../../_normalize.js";
import { IEEE_BINARY_NAN, IeeeBinary } from "../../ieee-binary-types.js";

/**
 * A × b.
 *
 * Result significand: `sig_a × sig_b` (up to 2p bits), which is then normalised
 * and rounded to p bits. The exponent sum accounts for the implicit `2^(p−1)`
 * scale on each operand.
 */
export function mul(
	a: IeeeBinary,
	b: IeeeBinary,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	const na = narrowToBigInt(a);
	const nb = narrowToBigInt(b);

	if (na.kind === "nan") return na;
	if (nb.kind === "nan") return nb;

	const resultSign = (na.sign ^ nb.sign) as 0 | 1;

	// Infinity cases
	if (na.kind === "inf" || nb.kind === "inf") {
		if (na.kind === "zero" || nb.kind === "zero") return IEEE_BINARY_NAN; // 0 × ∞ = NaN
		return { kind: "inf", sign: resultSign };
	}

	if (na.kind === "zero" || nb.kind === "zero") {
		return { kind: "zero", sign: resultSign };
	}

	// Both finite
	// value_a = sig_a × 2^(exp_a − (p−1))
	// value_b = sig_b × 2^(exp_b − (p−1))
	// product = sig_a × sig_b × 2^(exp_a + exp_b − 2(p−1))
	const rawProd = na.sig * nb.sig;
	const rawExp = na.exp + nb.exp - 2 * (format.p - 1);
	const { sig, exp } = normalizeSignificand(rawProd, rawExp, format);

	return finiteOrSpecial(sig, exp, resultSign, format);
}
