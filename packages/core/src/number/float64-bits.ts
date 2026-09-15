const BUFFER_ = new ArrayBuffer(8);
const FLOAT_ = new Float64Array(BUFFER_);
const BITS_ = new BigUint64Array(BUFFER_);

/**
 * The IEEE-754 binary64 bit pattern of `value`.
 *
 * A JS `number` _is_ a binary64, so this is exact for every input, `NaN` and
 * the infinities included. The `NaN` payload is whatever the runtime produced;
 * it is not canonicalised.
 */
export function float64ToBits(value: number): bigint {
	FLOAT_[0] = value;

	return BITS_[0]!;
}

/**
 * The binary64 value whose bit pattern is `bits`.
 *
 * `bits` is taken modulo 2⁶⁴, as the underlying `BigUint64Array` does.
 */
export function bitsToFloat64(bits: bigint): number {
	BITS_[0] = bits;

	return FLOAT_[0]!;
}
