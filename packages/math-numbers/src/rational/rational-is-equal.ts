import { rationalCompare } from "./rational-compare.js";
import { Rational } from "./rational-types.js";

/** `true` when `a` and `b` denote the same rational. */
export function rationalIsEqual(
	a: Readonly<Rational>,
	b: Readonly<Rational>,
): boolean {
	return rationalCompare(a, b) === 0;
}
