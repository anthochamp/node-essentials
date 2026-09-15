import { MASK_64N } from "@ac-kit/core";

/**
 * Encodes a non-negative `bigint` into a fresh `limbWords`-length limb array,
 * least significant limb first.
 *
 * Unlike {@link limb32FromBigInt} this refuses to truncate: a fixed-width
 * modular kernel that silently dropped the top of a modulus would compute in
 * the wrong ring, so overflow is an error rather than a wrap.
 *
 * Time complexity: O(`limbWords`).
 *
 * @param value - A non-negative `bigint` that fits in `limbWords` limbs.
 * @param limbWords - The destination width, in 64-bit limbs.
 * @throws {RangeError} When `value` is negative or does not fit.
 */
export function limb64FromBigInt(
	value: bigint,
	limbWords: number,
): BigUint64Array {
	if (value < 0n) {
		throw new RangeError("limb64FromBigInt: value must be non-negative");
	}

	const limbs = new BigUint64Array(limbWords);
	let remaining = value;

	for (let index = 0; index < limbWords; index++) {
		limbs[index] = remaining & MASK_64N;
		remaining >>= 64n;
	}

	if (remaining !== 0n) {
		throw new RangeError(
			`limb64FromBigInt: value does not fit in ${limbWords} 64-bit limbs`,
		);
	}

	return limbs;
}
