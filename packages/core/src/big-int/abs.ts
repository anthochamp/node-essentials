/** Absolute value — the `bigint` equivalent `Math.abs` does not accept. */
export function bigIntAbs(value: bigint): bigint {
	return value < 0n ? -value : value;
}
