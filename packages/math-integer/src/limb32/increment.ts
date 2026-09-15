/**
 * `limbs + 1`, returning a fresh array with the carry propagated across words.
 *
 * A carry out of the top limb is dropped: the result keeps the input's width.
 *
 * Time complexity: O(n) in the limb count, worst case; O(1) when the low limb
 * does not overflow.
 */
export function limb32Increment(limbs: Uint32Array): Uint32Array {
	const result = new Uint32Array(limbs);

	for (let index = 0; index < result.length; index++) {
		const sum = (result[index]! + 1) >>> 0;
		result[index] = sum;

		if (sum !== 0) {
			break; // no carry into the next word
		}
	}

	return result;
}
