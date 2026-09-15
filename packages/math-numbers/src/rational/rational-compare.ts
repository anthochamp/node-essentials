import { ComparatorResult } from "@ac-kit/core";

import { Rational } from "./rational-types.js";

/**
 * Three-way comparison, by cross-multiplication.
 *
 * Both denominators are positive by the type's invariant, so the products can
 * be compared directly without tracking a sign flip.
 */
export function rationalCompare(
	a: Readonly<Rational>,
	b: Readonly<Rational>,
): ComparatorResult {
	const left = a.numerator * b.denominator;
	const right = b.numerator * a.denominator;

	if (left < right) {
		return -1;
	}

	return left > right ? 1 : 0;
}
