import { bigIntBitLength, bigIntSqrt } from "@ac-kit/core";

import { IeeeFormat } from "../ieee-format.js";
import { finiteOrSpecial } from "./_finite-or-special.js";
import { narrowToBigInt } from "./_narrow-to-big-int.js";
import { normalizeSignificand } from "./_normalize.js";
import { IEEE_BINARY_NAN, IeeeBinary } from "./ieee-binary-types.js";

/**
 * √a — principal (non-negative) square root. The one implementation — not
 * accelerated, not swappable.
 *
 * Algorithm:
 *
 * 1. Scale the significand to approximately 2p bits (keeping the effective
 *    exponent even) so that `isqrt` yields ~p bits.
 * 2. Compute the integer square root and the remainder (sticky bit).
 * 3. Normalise and round.
 *
 * √(−x) = NaN, √(−0) = −0 (IEEE 754 §6.3), √+∞ = +∞.
 */
export function ieeeBinarySqrt(
	a: IeeeBinary,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	const na = narrowToBigInt(a);

	if (na.kind === "nan") return na;
	if (na.kind === "zero") return na; // √±0 = ±0
	if (na.kind === "inf") {
		return na.sign === 1 ? IEEE_BINARY_NAN : na; // √+∞ = +∞, √−∞ = NaN
	}
	if (na.sign === 1) return IEEE_BINARY_NAN; // √(negative) = NaN

	const p = format.p;

	// value = sig × 2^k, where k = exp − (p − 1)  (positional exponent)
	let { sig, exp } = na;
	let k = exp - (p - 1);

	// Expand to 2p + 2 bits so the root carries p + 1 bits. With only p bits
	// `sfNormalize` has nothing to discard, and a sticky bit it cannot act on
	// is a sticky bit that rounds every inexact root down.
	const curLen = bigIntBitLength(sig);
	const targetLen = 2 * p + 2;
	let S = targetLen - curLen; // bits to shift left

	// Adjust S so that (k − S) is even
	if (((k - S) & 1) !== 0) S++;
	sig <<= BigInt(S);
	k -= S;
	// k is now even

	// Integer square root of the expanded significand
	const sqrtSig = bigIntSqrt(sig);
	const rem = sig - sqrtSig * sqrtSig;
	const sticky = rem !== 0n;

	// rawExp for sfNormalize: sqrtSig × 2^rawExp gives √value
	// √(sig × 2^k) = sqrtSig × 2^(k/2)  (plain positional form)
	const rawExp = k >> 1;
	const { sig: nSig, exp: nExp } = normalizeSignificand(
		sqrtSig,
		rawExp,
		format,
		sticky,
	);

	return finiteOrSpecial(nSig, nExp, 0, format);
}
