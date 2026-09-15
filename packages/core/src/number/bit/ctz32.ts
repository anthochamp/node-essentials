/**
 * Counts the trailing zero bits in the low 32 bits of `value`.
 *
 * The complement `Math.clz32` doesn't provide: that counts from the high end,
 * nothing built in counts from the low end. `value & -value` isolates the
 * lowest set bit, leaving a power of two whose leading-zero count fixes its
 * position — so the answer is `31 - Math.clz32` of it. Zero has no set bit to
 * isolate and is handled separately.
 *
 * @param value - The value to inspect; only its low 32 bits are considered.
 * @returns The number of trailing zero bits, from 0 to 32. `ctz32(0)` is 32,
 *   matching `Math.clz32(0)` being 32.
 */
export function ctz32(value: number): number {
	const x = value >>> 0;

	return x === 0 ? 32 : 31 - Math.clz32(x & -x);
}
