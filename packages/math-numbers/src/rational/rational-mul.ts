import { bigIntGcd } from "@ac-kit/math-integer";

import { Rational } from "./rational-types.js";

/**
 * `a × b`, as `(a.n·b.n) / (a.d·b.d)`.
 *
 * Cross-cancelling before multiplying keeps both products at the width of the
 * operands rather than their sum.
 */
export function rationalMul(
	a: Readonly<Rational>,
	b: Readonly<Rational>,
): Rational {
	const left = bigIntGcd(a.numerator, b.denominator);
	const right = bigIntGcd(b.numerator, a.denominator);

	if (left === 1n && right === 1n) {
		return {
			numerator: a.numerator * b.numerator,
			denominator: a.denominator * b.denominator,
			reduced: a.reduced && b.reduced,
		};
	}

	return {
		numerator: (a.numerator / left) * (b.numerator / right),
		denominator: (a.denominator / right) * (b.denominator / left),
		reduced: a.reduced && b.reduced,
	};
}
