import { rationalInv } from "./rational-inv.js";
import { rationalMul } from "./rational-mul.js";
import { Rational } from "./rational-types.js";

/**
 * `a ÷ b`.
 *
 * @throws {RangeError} When `b` is zero.
 */
export function rationalDiv(
	a: Readonly<Rational>,
	b: Readonly<Rational>,
): Rational {
	return rationalMul(a, rationalInv(b));
}
