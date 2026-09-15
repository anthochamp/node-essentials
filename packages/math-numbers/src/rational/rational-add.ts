import { bigIntGcd } from "@ac-kit/math-integer";

import { rationalReduce } from "./rational-reduce.js";
import { Rational } from "./rational-types.js";

/**
 * `a + b`, as `(a.n·b.d + b.n·a.d) / (a.d·b.d)`.
 *
 * The denominators are divided by their GCD first, so the intermediate product
 * stays as small as the operands allow. Without it the denominator of a long
 * sum grows as the product of every denominator seen.
 */
export function rationalAdd(
	a: Readonly<Rational>,
	b: Readonly<Rational>,
): Rational {
	const common = bigIntGcd(a.denominator, b.denominator);

	if (common === 1n) {
		return {
			numerator: a.numerator * b.denominator + b.numerator * a.denominator,
			denominator: a.denominator * b.denominator,
			reduced: false,
		};
	}

	const aScale = b.denominator / common;
	const bScale = a.denominator / common;
	const numerator = a.numerator * aScale + b.numerator * bScale;

	return rationalReduce({
		numerator,
		denominator: a.denominator * aScale,
		reduced: false,
	});
}
