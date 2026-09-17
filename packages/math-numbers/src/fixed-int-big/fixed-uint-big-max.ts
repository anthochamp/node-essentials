/**
 * The largest value a `bitWidth`-bit unsigned integer holds: `2 ** bitWidth -
 * 1`.
 *
 * There is no `fixedUIntBigMin` — it is `0n` at every width — and no separate
 * mask constant: the only things that wanted one are `BigInt.asUintN` and
 * `BigInt.asIntN`, which take the width directly.
 *
 * A width of zero answers `0n`, the single-valued range `BigInt.asUintN(0, x)`
 * also lands on. Widths outside the non-negative integers are not part of the
 * domain and are not rejected: unlike {@link fixedUIntBigFrom}, this admits no
 * value and so has nothing to guard.
 *
 * @param bitWidth - Width of the integer, in bits.
 */
export function fixedUIntBigMax(bitWidth: number): bigint {
	return (1n << BigInt(bitWidth)) - 1n;
}
