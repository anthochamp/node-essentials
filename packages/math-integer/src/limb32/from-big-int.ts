import { MASK_32N } from "@ac-kit/core";

/**
 * Encodes a non-negative `bigint` into a fresh `limbWords`-length limb array,
 * least significant limb first.
 *
 * Time complexity: O(`limbWords`).
 *
 * @param value - A non-negative `bigint`. Bits beyond `limbWords * 32` are
 *   dropped.
 * @param limbWords - The destination width, in 32-bit limbs.
 */
export function limb32FromBigInt(
	value: bigint,
	limbWords: number,
): Uint32Array {
	const limbs = new Uint32Array(limbWords);
	let remaining = value;

	for (let index = 0; index < limbWords; index++) {
		limbs[index] = Number(remaining & MASK_32N);
		remaining >>= 32n;
	}

	return limbs;
}
