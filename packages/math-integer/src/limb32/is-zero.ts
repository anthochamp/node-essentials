/** `true` when every limb is zero. Time complexity: O(n) in the limb count. */
export function limb32IsZero(limbs: Uint32Array): boolean {
	for (let index = 0; index < limbs.length; index++) {
		if (limbs[index] !== 0) {
			return false;
		}
	}

	return true;
}
