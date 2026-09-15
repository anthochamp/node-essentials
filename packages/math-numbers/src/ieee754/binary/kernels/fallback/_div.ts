import { IeeeFormat } from "../../../ieee-format.js";
import { finiteOrSpecial } from "../../_finite-or-special.js";
import { narrowToBigInt } from "../../_narrow-to-big-int.js";
import { normalizeSignificand } from "../../_normalize.js";
import { IEEE_BINARY_NAN, IeeeBinary } from "../../ieee-binary-types.js";

/**
 * A / b.
 *
 * The dividend is scaled by `2^SCALE` (SCALE = p + 2 extra guard/round/sticky
 * bits) before integer division, giving a quotient of approximately `p + 2`
 * bits. The remainder provides the sticky bit for correct rounding.
 */
export function div(
	a: IeeeBinary,
	b: IeeeBinary,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	const na = narrowToBigInt(a);
	const nb = narrowToBigInt(b);

	if (na.kind === "nan") return na;
	if (nb.kind === "nan") return nb;

	const resultSign = (na.sign ^ nb.sign) as 0 | 1;

	if (na.kind === "inf" && nb.kind === "inf") return IEEE_BINARY_NAN; // ∞ / ∞ = NaN
	if (na.kind === "zero" && nb.kind === "zero") return IEEE_BINARY_NAN; // 0 / 0 = NaN

	if (na.kind === "inf") return { kind: "inf", sign: resultSign };
	if (nb.kind === "inf") return { kind: "zero", sign: resultSign };
	if (na.kind === "zero") return { kind: "zero", sign: resultSign };
	if (nb.kind === "zero") return { kind: "inf", sign: resultSign };

	// Both finite.
	// Scale dividend for p + 2 fractional bits of precision.
	const SCALE = format.p + 2;
	const scaledA = na.sig << BigInt(SCALE);
	const q = scaledA / nb.sig;
	const r = scaledA % nb.sig;
	const sticky = r !== 0n;

	// value = (a.sig / b.sig) × 2^(a.exp − b.exp)
	// After scaling:  q ≈ (a.sig / b.sig) × 2^SCALE
	// rawExp: q × 2^rawExp gives the unscaled quotient
	const rawExp = na.exp - nb.exp - SCALE;
	const { sig, exp } = normalizeSignificand(q, rawExp, format, sticky);

	return finiteOrSpecial(sig, exp, resultSign, format);
}
