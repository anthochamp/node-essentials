/**
 * Shift right by `n` bits, truncating, returning a fresh array the same length
 * as `limbs`.
 *
 * Time complexity: O(n) in the limb count.
 */
export function limb32ShiftRightTrunc(
	limbs: Uint32Array,
	n: number,
): Uint32Array {
	const result = new Uint32Array(limbs.length);
	const wordShift = n >>> 5;
	const bitShift = n & 31;

	for (let index = 0; index < limbs.length; index++) {
		const srcIndex = index + wordShift;

		if (srcIndex >= limbs.length) {
			continue;
		}

		let value = limbs[srcIndex]! >>> bitShift;

		if (bitShift > 0 && srcIndex + 1 < limbs.length) {
			value |= (limbs[srcIndex + 1]! << (32 - bitShift)) >>> 0;
		}

		result[index] = value >>> 0;
	}

	return result;
}
