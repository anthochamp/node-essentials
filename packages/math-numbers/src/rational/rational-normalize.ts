import { Rational } from "./rational-types.js";

/**
 * Builds a rational from a numerator and denominator, moving the sign onto the
 * numerator.
 *
 * The result is not reduced — reduction costs a GCD, and a chain of operations
 * only needs it once, at the end. Pass through {@link ratReduce} when lowest
 * terms are wanted.
 *
 * @throws {RangeError} When `denominator` is zero.
 */
export function rationalNormalize(
	numerator: bigint,
	denominator = 1n,
): Rational {
	if (denominator === 0n) {
		throw new RangeError("Rational denominator cannot be zero");
	}

	if (denominator < 0n) {
		return {
			numerator: -numerator,
			denominator: -denominator,
			reduced: false,
		};
	}

	return { numerator, denominator, reduced: false };
}
