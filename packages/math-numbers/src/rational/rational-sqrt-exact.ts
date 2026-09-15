import { bigIntSqrtExact } from "@ac-kit/core";

import { rationalReduce } from "./rational-reduce.js";
import { Rational } from "./rational-types.js";

/**
 * The exact square root, when both numerator and denominator of the reduced
 * form are perfect squares — `√(4/9) = 2/3`.
 *
 * @returns The exact root, or `null` when it is irrational.
 * @throws {RangeError} When `value` is negative.
 */
export function rationalSqrtExact(value: Readonly<Rational>): Rational | null {
	if (value.numerator < 0n) {
		throw new RangeError("Square root of a negative rational is not real");
	}

	const reduced = rationalReduce(value);
	const numerator = bigIntSqrtExact(reduced.numerator);
	const denominator = bigIntSqrtExact(reduced.denominator);

	if (numerator === null || denominator === null) {
		return null;
	}

	return { numerator, denominator, reduced: true };
}
