import { MASK_64N } from "@ac-kit/core";

/**
 * Converts a non-negative `bigint` to little-endian 64-bit limbs.
 *
 * For public values only — see the module documentation. `words` is the
 * destination width; the value must fit within it.
 *
 * @throws {RangeError} When `value` is negative or does not fit in `words`
 *   limbs.
 */
export function bigIntToLimbs(value: bigint, words: number): BigUint64Array {
	if (value < 0n) {
		throw new RangeError("bigIntToLimbs: value must be non-negative");
	}

	const limbs = new BigUint64Array(words);
	let remaining = value;

	for (let index = 0; index < words; index++) {
		limbs[index] = remaining & MASK_64N;
		remaining >>= 64n;
	}

	if (remaining !== 0n) {
		throw new RangeError(
			`bigIntToLimbs: value does not fit in ${words} 64-bit limbs`,
		);
	}

	return limbs;
}
