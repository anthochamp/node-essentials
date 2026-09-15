const BUFFER_ = new ArrayBuffer(4);
const FLOAT_ = new Float32Array(BUFFER_);
const BITS_ = new Uint32Array(BUFFER_);

/**
 * The IEEE-754 binary32 bit pattern of `value`, as an unsigned 32-bit integer.
 *
 * A `number` is a binary64, so `value` is first rounded to binary32 exactly as
 * `Math.fround` does — the bits describe that rounded value, not the original.
 */
export function float32ToBits(value: number): number {
	FLOAT_[0] = value;

	return BITS_[0]!;
}

/**
 * The binary32 value whose bit pattern is `bits`, widened to a `number`.
 *
 * `bits` is taken modulo 2³², as the underlying `Uint32Array` does.
 */
export function bitsToFloat32(bits: number): number {
	BITS_[0] = bits;

	return FLOAT_[0]!;
}
