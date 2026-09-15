/**
 * Floored remainder — takes the sign of the **divisor**, so it pairs with
 * {@link bigIntDivFloor}: `dividend === bigIntDivFloor(a, b) * b + bigIntMod(a,
 * b)`.
 *
 * This is what `mod` names in Knuth, Haskell, Lisp, Ada, Julia and Ruby, and
 * what Python's `%` computes. It is not `bigint`'s `%`, which takes the sign of
 * the dividend: `-7n % 2n` is `-1n`, while `bigIntMod(-7n, 2n)` is `1n`.
 *
 * For a remainder that stays non-negative even when the divisor is negative,
 * use {@link bigIntModEuclid}.
 *
 * @throws {RangeError} When `divisor` is zero.
 */
export function bigIntMod(dividend: bigint, divisor: bigint): bigint {
	if (divisor === 0n) {
		throw new RangeError("Division by zero");
	}

	const remainder = dividend % divisor;

	if (remainder !== 0n && remainder < 0n !== divisor < 0n) {
		return remainder + divisor;
	}

	return remainder;
}
