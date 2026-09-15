import { Rational } from "./rational-types.js";

/**
 * The reciprocal `1/a`.
 *
 * @throws {RangeError} When `value` is zero.
 */
export function rationalInv(value: Readonly<Rational>): Rational {
	if (value.numerator === 0n) {
		throw new RangeError("Division by zero");
	}

	if (value.numerator < 0n) {
		return {
			numerator: -value.denominator,
			denominator: -value.numerator,
			reduced: value.reduced,
		};
	}

	return {
		numerator: value.denominator,
		denominator: value.numerator,
		reduced: value.reduced,
	};
}
