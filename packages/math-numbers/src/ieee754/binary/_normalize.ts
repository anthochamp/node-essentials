/**
 * Significand normalization and round-to-nearest-even for software IEEE 754.
 *
 * The representation convention used throughout the soft-float engine:
 *
 * Value = sig × 2^(exp − (p − 1))
 *
 * Where `sig` is a `p`-bit integer whose leading bit is at position `p − 1`
 * (i.e. `2^(p-1) ≤ sig < 2^p` for normals), and `exp` is the unbiased
 * exponent.
 *
 * `sfNormalize` takes a raw `(sig_raw, rawExp)` pair where value = sig_raw ×
 * 2^rawExp (plain positional pair, no p-bias) and returns the canonical
 * `(sig_p, exp)` pair in the convention above.
 *
 * Rounding mode: round-to-nearest, ties-to-even (IEEE 754 default).
 *
 * References:
 *
 * - IEEE 754-2019 §4.3.1 (roundTiesToEven)
 * - Muller et al., "Handbook of Floating-Point Arithmetic" §2.2
 */

import { bigIntBitLength } from "@ac-kit/core";

import { IeeeFormat, ieeeEMin } from "../ieee-format.js";
import { IeeeBinaryFinite } from "./ieee-binary-types.js";

/**
 * Normalize a raw `(sig, rawExp)` pair to the canonical p-bit representation
 * and apply round-to-nearest-even when significand bits must be discarded.
 *
 * Input contract: value = sig_raw × 2^rawExp (sig_raw may have any positive
 * number of bits)
 *
 * Output contract: value ≈ sig_out × 2^(expOut − (p − 1)) where `sig_out` has
 * exactly `p` bits.
 *
 * The output exponent uses the soft-float convention: expOut = rawExp +
 * sfBitLength(sig_raw) − 1 (adjusted for any rounding carry).
 *
 * @param sig - Raw significand (must be > 0).
 * @param rawExp - Positional exponent such that value = sig × 2^rawExp.
 * @param format - IEEE 754 format (provides `p`).
 * @param sticky - Extra sticky bit: `true` if any bits below `sig` were
 *   discarded earlier in the computation (e.g. division remainder).
 * @returns `{ sig, exp }` in the canonical form, or `{ sig: 0n, exp: 0 }` if
 *   the input is zero.
 */
export function normalizeSignificand(
	sig: bigint,
	rawExp: number,
	format: IeeeFormat,
	sticky = false,
): Pick<IeeeBinaryFinite<bigint>, "sig" | "exp"> {
	if (sig === 0n) return { sig: 0n, exp: 0 };

	const p = format.p;
	const len = bigIntBitLength(sig);

	// expOut such that value = sig_out × 2^(expOut − (p−1))
	// Derived from: sig_raw × 2^rawExp = sig_out × 2^(expOut − (p−1))
	// => expOut = rawExp + len − 1 (before any carry from rounding)
	const baseExp = rawExp + len - 1;

	// Below emin only part of the significand is representable. Rounding to p
	// bits here and letting the packer round again onto the subnormal grid
	// double-rounds, which moves results by an ulp in either direction, so the
	// reduced width is applied now and the packer finds nothing left to do.
	const emin = ieeeEMin(format);
	const target = baseExp < emin ? p - (emin - baseExp) : p;

	if (target <= 0) {
		// Below the smallest subnormal, but not necessarily zero: anything above
		// half of it rounds up to it. Comparing `sig` against `2^(emin−p−rawExp)`
		// is the same comparison as `value > 2^(emin−p)`, done in integers.
		const half = emin - p - rawExp;
		const roundsUp =
			half < 0 ||
			sig > 1n << BigInt(half) ||
			(sig === 1n << BigInt(half) && sticky);

		if (!roundsUp) {
			return { sig: 0n, exp: 0 };
		}

		return { sig: 1n << BigInt(p - 1), exp: emin - p + 1 };
	}

	if (len > target) {
		// Too many bits — must round away (len − target) low-order bits.
		const extra = len - target;
		const roundMask = (1n << BigInt(extra)) - 1n;
		const discarded = sig & roundMask;

		// Guard bit: the highest of the discarded bits
		const guard = (sig >> BigInt(extra - 1)) & 1n;
		// Sticky: any bit below the guard is non-zero, OR caller-supplied sticky
		const stickyBit =
			sticky || (discarded & ((1n << BigInt(extra - 1)) - 1n)) !== 0n;
		// LSB of the rounded result (used for ties-to-even)
		const lsb = (sig >> BigInt(extra)) & 1n;

		let result = sig >> BigInt(extra);
		// Round up when: guard=1 AND (any sticky bit set OR result is odd)
		if (guard === 1n && (stickyBit || lsb === 1n)) {
			result += 1n;
		}

		// A round-up may carry into a new leading bit.
		if (bigIntBitLength(result) > target) {
			return { sig: (result >> 1n) << BigInt(p - target), exp: baseExp + 1 };
		}

		// Restore the p-bit convention; the low bits are zero by construction.
		return { sig: result << BigInt(p - target), exp: baseExp };
	}

	if (len < p) {
		// Too few bits — shift left to fill p bits; compensate in exponent.
		const shift = p - len;
		return { sig: sig << BigInt(shift), exp: baseExp };
	}

	// Exactly p bits — no adjustment needed.
	return { sig, exp: baseExp };
}
