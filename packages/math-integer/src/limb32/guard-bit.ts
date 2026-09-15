/**
 * The guard bit for a round-to-nearest right shift by `n` (bit `n − 1`) — the
 * most significant bit `limb32ShiftRightTrunc` is about to discard.
 *
 * Time complexity: O(1).
 */
export function limb32GuardBit(limbs: Uint32Array, n: number): 0 | 1 {
	if (n === 0) {
		return 0;
	}

	const pos = n - 1;

	return ((limbs[pos >>> 5]! >>> (pos & 31)) & 1) as 0 | 1;
}
