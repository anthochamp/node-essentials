const BUFFER_ = new ArrayBuffer(2);
const FLOAT_ = new Float16Array(BUFFER_);
const BITS_ = new Uint16Array(BUFFER_);

/**
 * The IEEE-754 binary16 bit pattern of `value`, as an unsigned 16-bit integer.
 *
 * A `number` is a binary64, so `value` is first rounded to binary16 exactly as
 * `Math.f16round` does — the bits describe that rounded value, not the
 * original.
 */
export function float16ToBits(value: number): number {
	FLOAT_[0] = value;

	return BITS_[0]!;
}

/**
 * The binary16 value whose bit pattern is `bits`, widened to a `number`.
 *
 * `bits` is taken modulo 2¹⁶, as the underlying `Uint16Array` does.
 */
export function bitsToFloat16(bits: number): number {
	BITS_[0] = bits;

	return FLOAT_[0]!;
}
