import { rationalNeg } from "./rational-neg.js";
import { Rational } from "./rational-types.js";

/** `|a|`. */
export function rationalAbs(value: Readonly<Rational>): Rational {
	return value.numerator < 0n ? rationalNeg(value) : value;
}
