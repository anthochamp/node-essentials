/**
 * The constant-time kernel contract. Every method processes exactly `words`
 * limbs (or `2 * words` for {@link ConstantTimeKernel.barrettReduce}'s input),
 * regardless of the operands' actual magnitude — leading zero limbs are not
 * skipped, because skipping them would make the running time depend on the
 * value.
 */
export type ConstantTimeKernel = {
	/** Maximum `words` this kernel's scratch buffers support. */
	readonly maxWords: number;

	add(
		a: BigUint64Array,
		b: BigUint64Array,
		words: number,
	): { result: BigUint64Array; carry: 0 | 1 };

	sub(
		a: BigUint64Array,
		b: BigUint64Array,
		words: number,
	): { result: BigUint64Array; borrow: 0 | 1 };

	/** Three-way comparison, computed without a value-dependent branch. */
	cmp(a: BigUint64Array, b: BigUint64Array, words: number): -1 | 0 | 1;

	/**
	 * `a × b × R⁻¹ mod modulus`. Requires `a < modulus`, `b < modulus`, and
	 * `modulus` odd.
	 */
	montgomeryMultiply(
		a: BigUint64Array,
		b: BigUint64Array,
		modulus: BigUint64Array,
		n0inv: bigint,
		words: number,
	): BigUint64Array;

	/** `value × R mod modulus`, using a precomputed {@link montgomeryRSquared}. */
	toMontgomery(
		value: BigUint64Array,
		modulus: BigUint64Array,
		rSquared: BigUint64Array,
		n0inv: bigint,
		words: number,
	): BigUint64Array;

	/** `value × R⁻¹ mod modulus`. */
	fromMontgomery(
		value: BigUint64Array,
		modulus: BigUint64Array,
		n0inv: bigint,
		words: number,
	): BigUint64Array;

	/**
	 * `base^exponent mod modulus`, processing exactly `expBits` exponent bits.
	 *
	 * `expBits` must come from the public protocol parameters (e.g. always the
	 * modulus bit-length for an RSA private-key operation) — deriving it from the
	 * exponent's own magnitude leaks the exponent's bit-length through the
	 * running time, which for a private exponent is exactly the secret this
	 * kernel exists to protect.
	 */
	modExp(
		base: BigUint64Array,
		exponent: BigUint64Array,
		modulus: BigUint64Array,
		rSquared: BigUint64Array,
		n0inv: bigint,
		expBits: number,
		words: number,
	): BigUint64Array;

	/**
	 * `value mod modulus`, for a `2 × words`-limb `value`, using a precomputed
	 * {@link barrettMu}.
	 *
	 * `words` is capped at half of {@link ConstantTimeKernel.maxWords} for this
	 * operation specifically, since `value` needs twice the room a single operand
	 * does.
	 */
	barrettReduce(
		value: BigUint64Array,
		modulus: BigUint64Array,
		mu: BigUint64Array,
		words: number,
	): BigUint64Array;
};
