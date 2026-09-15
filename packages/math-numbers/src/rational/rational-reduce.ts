import { bigIntGcd } from "@ac-kit/math-integer";

import { Rational } from "./rational-types.js";

/** Returns an equivalent rational in lowest terms. */
export function rationalReduce(value: Readonly<Rational>): Rational {
	if (value.reduced) {
		return value;
	}

	const divisor = bigIntGcd(value.numerator, value.denominator);

	if (divisor === 1n) {
		return { ...value, reduced: true };
	}

	return {
		numerator: value.numerator / divisor,
		denominator: value.denominator / divisor,
		reduced: true,
	};
}
