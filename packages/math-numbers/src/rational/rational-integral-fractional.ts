import { Rational } from "./rational-types.js";

/**
 * The truncated quotient and the remaining fraction: `⌊|a|⌋` with the sign of
 * `a`, and the part left over.
 */
export function rationalIntegralFractional(value: Readonly<Rational>): {
	integral: bigint;
	fractional: Rational;
} {
	const integral = value.numerator / value.denominator;

	return {
		integral,
		fractional: {
			numerator: value.numerator - integral * value.denominator,
			denominator: value.denominator,
			reduced: false,
		},
	};
}
