/**
 * Decodes a little-endian 32-bit limb array back into a `bigint`.
 *
 * Time complexity: O(n) in the limb count.
 */
export function limb32ToBigInt(limbs: Uint32Array): bigint {
	let value = 0n;

	for (let index = 0; index < limbs.length; index++) {
		value |= BigInt(limbs[index]!) << BigInt(index * 32);
	}

	return value;
}
