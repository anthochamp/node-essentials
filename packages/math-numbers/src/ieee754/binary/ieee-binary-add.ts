import { negSign } from "../common/_neg-sign.js";
import { IeeeFormat } from "../ieee-format.js";
import { finiteOrSpecial } from "./_finite-or-special.js";
import { narrowToBigInt } from "./_narrow-to-big-int.js";
import { normalizeSignificand } from "./_normalize.js";
import {
	IEEE_BINARY_NAN,
	IeeeBinary,
	IeeeBinaryFinite,
} from "./ieee-binary-types.js";

/**
 * `a + b`. The one implementation — not accelerated, not swappable.
 *
 * When signs differ this is effectively a subtraction; the correct sign of the
 * result is determined by the magnitude comparison.
 */
export function ieeeBinaryAdd(
	a: IeeeBinary,
	b: IeeeBinary,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	const na = narrowToBigInt(a);
	const nb = narrowToBigInt(b);

	// Propagate NaN first (IEEE 754 §6.2)
	if (na.kind === "nan") return na;
	if (nb.kind === "nan") return nb;

	// ±∞ cases
	if (na.kind === "inf" && nb.kind === "inf") {
		if (na.sign !== nb.sign) return IEEE_BINARY_NAN; // +∞ + (−∞) = NaN
		return na;
	}
	if (na.kind === "inf") return na;
	if (nb.kind === "inf") return nb;

	// Zero + Zero → +0 (IEEE 754 §6.3: −0 + −0 = −0, otherwise +0)
	if (na.kind === "zero" && nb.kind === "zero") {
		return { kind: "zero", sign: (na.sign & nb.sign) as 0 | 1 };
	}
	if (na.kind === "zero") return nb;
	if (nb.kind === "zero") return na;

	// Both finite
	if (na.sign === nb.sign) {
		return addMagnitudes_(na, nb, na.sign, format);
	}
	return subMagnitudes_(na, nb, na.sign, format);
}

/**
 * Add two same-sign finite operands (magnitudes are summed). `resultSign` is
 * the shared sign of both operands.
 */
function addMagnitudes_(
	a: IeeeBinaryFinite<bigint>,
	b: IeeeBinaryFinite<bigint>,
	resultSign: 0 | 1,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	const p = format.p;

	// Ensure a has the larger (or equal) exponent
	let { exp: aExp, sig: aSig } = a;
	let { exp: bExp, sig: bSig } = b;
	if (aExp < bExp) {
		[aSig, aExp, bSig, bExp] = [bSig, bExp, aSig, aExp];
	}

	// Align by scaling the larger operand up rather than truncating the smaller
	// one. The sum is then exact and `sfNormalize` rounds once with every
	// discarded bit still present. Shifting the smaller operand right loses the
	// sticky information whenever the sum lands on exactly p bits, which is
	// what made `1 + 0.1` round down by one ulp.
	const shiftAmt = aExp - bExp;
	let sticky = false;
	let rawExp = aExp - (p - 1);

	if (shiftAmt > 0) {
		if (shiftAmt > p + 2) {
			// b sits below every bit that could affect the rounding decision.
			sticky = bSig !== 0n;
			bSig = 0n;
		} else {
			aSig <<= BigInt(shiftAmt);
			rawExp -= shiftAmt;
		}
	}

	const sum = aSig + bSig;
	const { sig, exp } = normalizeSignificand(sum, rawExp, format, sticky);

	return finiteOrSpecial(sig, exp, resultSign, format);
}

/**
 * Subtract two same-sign finite operands (magnitudes are differenced).
 * `possibleSign` is the sign of `a`; result sign may flip depending on
 * magnitudes.
 */
function subMagnitudes_(
	a: IeeeBinaryFinite<bigint>,
	b: IeeeBinaryFinite<bigint>,
	possibleSign: 0 | 1,
	format: IeeeFormat,
): IeeeBinary<bigint> {
	const p = format.p;

	// Ensure a has the larger (or equal) exponent for alignment
	let { exp: aExp, sig: aSig } = a;
	let { exp: bExp, sig: bSig } = b;
	let flipped = false;
	if (aExp < bExp) {
		[aSig, aExp, bSig, bExp] = [bSig, bExp, aSig, aExp];
		flipped = true;
	}

	// Same exact alignment as addition: scale the larger operand up so no bit is
	// discarded before the single rounding in `sfNormalize`.
	let sticky = false;
	const shiftAmt = aExp - bExp;
	let rawExp = aExp - (p - 1);

	if (shiftAmt > 0) {
		if (shiftAmt > p + 2) {
			sticky = bSig !== 0n;
			bSig = 0n;
		} else {
			aSig <<= BigInt(shiftAmt);
			rawExp -= shiftAmt;
		}
	}

	let diff: bigint;
	let resultSign: 0 | 1;
	if (aSig >= bSig) {
		diff = aSig - bSig;
		resultSign = flipped ? negSign(possibleSign) : possibleSign;
	} else {
		diff = bSig - aSig;
		resultSign = flipped ? possibleSign : negSign(possibleSign);
		// Sticky bit sense remains the same (we subtracted in the other direction)
	}

	if (diff === 0n) return { kind: "zero", sign: 0 }; // exact cancellation → +0

	const { sig, exp } = normalizeSignificand(diff, rawExp, format, sticky);

	return finiteOrSpecial(sig, exp, resultSign, format);
}
