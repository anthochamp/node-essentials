/**
 * Sign of `value` — the `bigint` equivalent `Math.sign` does not accept.
 *
 * Returns a `number` rather than a `bigint`: the result is a three-way flag,
 * and every consumer of one (comparators, index arithmetic) wants a `number`.
 */
export function bigIntSign(value: bigint): -1 | 0 | 1 {
	if (value < 0n) {
		return -1;
	}

	return value > 0n ? 1 : 0;
}
