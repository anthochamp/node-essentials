/**
 * `true` if any bit below the guard bit (positions `0 .. n − 2`) is set — what
 * separates an exact halfway case from one just above it.
 *
 * Time complexity: O(n) in the shift amount.
 */
export function limb32StickyBelow(limbs: Uint32Array, n: number): boolean {
	for (let pos = 0; pos < n - 1; pos++) {
		if (((limbs[pos >>> 5]! >>> (pos & 31)) & 1) !== 0) {
			return true;
		}
	}

	return false;
}
