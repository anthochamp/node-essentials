/**
 * Euclidean remainder — always in `[0, |modulus|)`, whatever the signs.
 *
 * Differs from {@link mod} only when `modulus` is negative, where the floored
 * remainder follows the modulus' sign and this one stays non-negative: `mod(-7,
 * -2)` is `-1`, `modEuclid(-7, -2)` is `1`.
 *
 * @throws {RangeError} When `modulus` is zero.
 */
export function modEuclid(value: number, modulus: number): number {
	if (modulus === 0) {
		throw new RangeError("Division by zero");
	}

	const remainder = value % modulus;

	return remainder < 0 ? remainder + Math.abs(modulus) : remainder;
}
