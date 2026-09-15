import { MASK_64N, wordsForBits } from "@ac-kit/core";
import { limb64FromBigInt, limb64ToBigInt } from "@ac-kit/math-integer";

import { activeConstantTimeKernel } from "./kernel/common/kernel.js";
import { montgomeryN0Inv } from "./kernel/common/montgomery-n0-inv.js";
import { montgomeryRSquared } from "./kernel/common/montgomery-r-squared.js";

/**
 * `a⁻¹ mod modulus`, for prime `modulus`, by Fermat's little theorem:
 * `a^(modulus - 2) mod modulus`.
 *
 * This is not new arithmetic — it is `modExp` with an exponent derived from the
 * (public) modulus, computed here with ordinary `bigint` subtraction. A second
 * constant-time inversion algorithm implemented independently would only be a
 * second ladder to keep in sync with the first; composing the existing one is
 * both less code and less risk. A general odd-modulus inverse (Bernstein–Yang /
 * safegcd) is not provided — nothing in the current plan needs an inverse
 * against a composite modulus, and it is a materially different algorithm to
 * get right without an existing reference.
 *
 * `bits` is the public bit-length the modulus is understood to have for this
 * call (e.g. 256 for a P-256 scalar) — every exponentiation this performs
 * processes exactly that many exponent bits, so the running time depends on
 * `bits`, never on the actual value of `modulus - 2`.
 *
 * @throws {RangeError} When `modulus` is not an odd positive integer that fits
 *   in `bits` bits.
 */
export function constantTimeModInvPrime(
	a: bigint,
	modulus: bigint,
	bits: number,
): bigint {
	if (modulus <= 0n || (modulus & 1n) === 0n) {
		throw new RangeError(
			"constantTimeModInvPrime: modulus must be a positive odd integer",
		);
	}

	const activeKernel = activeConstantTimeKernel();

	const n0inv = montgomeryN0Inv(modulus & MASK_64N);
	const words = wordsForBits(bits, 64);
	const rSquared = montgomeryRSquared(modulus, words);
	const exponent = modulus - 2n;

	const result = activeKernel.modExp(
		limb64FromBigInt(a, words),
		limb64FromBigInt(exponent, words),
		limb64FromBigInt(modulus, words),
		limb64FromBigInt(rSquared, words),
		n0inv,
		bits,
		words,
	);

	return limb64ToBigInt(result);
}
