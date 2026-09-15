/**
 * Floored remainder — takes the sign of the **divisor**, so it pairs with
 * {@link divFloor}: `a === divFloor(a, m) * m + mod(a, m)`.
 *
 * This is what `mod` names in Knuth, Haskell, Lisp, Ada, Julia and Ruby, and
 * what Python's `%` computes. It is not JavaScript's `%`, which takes the sign
 * of the dividend: `-7 % 2` is `-1`, while `mod(-7, 2)` is `1`.
 *
 * For a remainder that stays non-negative even when the modulus is negative,
 * use {@link modEuclid}.
 *
 * @param value The dividend, may be negative.
 * @param modulus The divisor, may be negative.
 * @returns `value` reduced into `[0, modulus)` for a positive `modulus`.
 * @throws {RangeError} When `modulus` is zero.
 */
export function mod(value: number, modulus: number): number {
	if (modulus === 0) {
		throw new RangeError("Division by zero");
	}

	return ((value % modulus) + modulus) % modulus;
}
