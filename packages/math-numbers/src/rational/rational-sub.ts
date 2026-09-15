import { rationalAdd } from "./rational-add.js";
import { rationalNeg } from "./rational-neg.js";
import { Rational } from "./rational-types.js";

/** `a − b`. */
export function rationalSub(
	a: Readonly<Rational>,
	b: Readonly<Rational>,
): Rational {
	return rationalAdd(a, rationalNeg(b));
}
