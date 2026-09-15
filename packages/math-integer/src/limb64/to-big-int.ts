/**
 * Decodes a little-endian 64-bit limb array back into a non-negative `bigint`.
 *
 * Time complexity: O(n) in the limb count.
 */
export function limb64ToBigInt(limbs: BigUint64Array): bigint {
	let value = 0n;

	for (let index = limbs.length - 1; index >= 0; index--) {
		value = (value << 64n) | limbs[index]!;
	}

	return value;
}
