/**
 * Number of bits in `|value|`, which is `⌊log₂|value|⌋ + 1`. Zero for `0`.
 *
 * The `number` sibling of {@link bigIntBitLength}. `Math.clz32` settles the low
 * 32 bits directly; above that the value is split into two halves, since a safe
 * integer needs at most 53 bits.
 *
 * @param value - A safe integer; the fractional part of a non-integer is
 *   ignored.
 * @returns The bit length, from 0 to 53.
 */
export function bitLength(value: number): number {
	const magnitude = Math.floor(Math.abs(value));

	if (magnitude < 1) {
		return 0;
	}

	if (magnitude <= 0xffffffff) {
		return 32 - Math.clz32(magnitude);
	}

	return 64 - Math.clz32(Math.floor(magnitude / 0x100000000));
}
