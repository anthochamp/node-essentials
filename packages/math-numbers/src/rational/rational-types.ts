/**
 * An exact rational, stored as a pair of `bigint`s.
 *
 * This is the arithmetic layer for ℚ: plain data plus free functions, with no
 * class and no wrapper around the numerator and denominator. Every operation
 * here is real work — cross-multiplication, sign normalisation, reduction by
 * the greatest common divisor — which is what earns it a function rather than
 * an operator.
 *
 * **Invariant:** `denominator > 0`. The sign lives entirely in the numerator,
 * so comparison never has to inspect the denominator's sign. Values are not
 * necessarily reduced; {@link ratReduce} does that, and {@link isReduced}
 * records whether it has been done.
 */
export type Rational = {
	numerator: bigint;

	/** Always strictly positive. */
	denominator: bigint;

	/** `true` when `gcd(|numerator|, denominator) = 1` is known to hold. */
	reduced: boolean;
};

/** `0/1`. */
export const RATIONAL_ZERO = Object.freeze<Rational>({
	numerator: 0n,
	denominator: 1n,
	reduced: true,
});

/** `1/1`. */
export const RATIONAL_ONE = Object.freeze<Rational>({
	numerator: 1n,
	denominator: 1n,
	reduced: true,
});
