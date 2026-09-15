import { MASK_64N } from "@ac-kit/core";

/**
 * `-modulus₀⁻¹ mod 2⁶⁴` — the Montgomery constant tied to a modulus's least
 * significant limb. Computed once per modulus from public data via Newton's
 * iteration for inverses mod a power of two; the modulus must be odd.
 *
 * @throws {RangeError} When `modulus0` is even.
 */
export function montgomeryN0Inv(modulus0: bigint): bigint {
	if ((modulus0 & 1n) === 0n) {
		throw new RangeError("montgomeryN0Inv: modulus must be odd");
	}

	// Newton's iteration for the inverse of an odd number mod 2^64: doubles
	// the number of correct bits each round, so 6 rounds covers 64 bits from
	// a 1-bit seed.
	let inverse = 1n;

	for (let round = 0; round < 6; round++) {
		inverse = (inverse * (2n - modulus0 * inverse)) & MASK_64N;
	}

	return -inverse & MASK_64N;
}
