/**
 * Shift left by `n` bits, returning a fresh array the same length as `limbs`.
 *
 * Bits shifted past the top are dropped, so the result keeps the input's width.
 *
 * Time complexity: O(n) in the limb count.
 */
export function limb32ShiftLeft(limbs: Uint32Array, n: number): Uint32Array {
	const result = new Uint32Array(limbs.length);
	const wordShift = n >>> 5;
	const bitShift = n & 31;

	for (let index = limbs.length - 1; index >= 0; index--) {
		const srcIndex = index - wordShift;

		if (srcIndex < 0) {
			continue;
		}

		let value = limbs[srcIndex]! << bitShift;

		if (bitShift > 0 && srcIndex - 1 >= 0) {
			value |= limbs[srcIndex - 1]! >>> (32 - bitShift);
		}

		result[index] = value >>> 0;
	}

	return result;
}
