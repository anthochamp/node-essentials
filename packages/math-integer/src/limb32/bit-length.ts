/**
 * Significant-bit count: the position of the highest set bit, plus one. Zero
 * for an all-zero array.
 *
 * Time complexity: O(n) in the limb count, worst case.
 */
export function limb32BitLength(limbs: Uint32Array): number {
	for (let index = limbs.length - 1; index >= 0; index--) {
		const word = limbs[index]!;

		if (word !== 0) {
			return index * 32 + (32 - Math.clz32(word));
		}
	}

	return 0;
}
