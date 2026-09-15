import { IeeeFormat } from "../ieee-format.js";
import { finiteOrSpecial } from "./_finite-or-special.js";
import { narrowToBigInt } from "./_narrow-to-big-int.js";
import { normalizeSignificand } from "./_normalize.js";
import { IeeeBinary } from "./ieee-binary-types.js";

/**
 * Re-expresses `value` at `to`'s significand width.
 *
 * `IeeeBinaryFinite.sig` holds exactly `p` bits with its leading 1 at bit `p −
 * 1`, so a value carried between formats has to be renormalised. Reading its
 * bits against the wrong `p` would take, for binary16, the low ten bits of a
 * binary64 significand — all zero for `1.0`.
 */
export function toFormat(
	value: IeeeBinary,
	from: IeeeFormat,
	to: IeeeFormat,
): IeeeBinary<bigint> {
	const narrowed = narrowToBigInt(value);

	if (narrowed.kind !== "finite") {
		return narrowed;
	}

	const { sig, exp } = normalizeSignificand(
		narrowed.sig,
		narrowed.exp - (from.p - 1),
		to,
	);

	return finiteOrSpecial(sig, exp, narrowed.sign, to);
}
