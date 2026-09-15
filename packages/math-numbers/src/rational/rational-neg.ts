import { Rational } from "./rational-types.js";

/** `−a`. */
export function rationalNeg(value: Readonly<Rational>): Rational {
	return { ...value, numerator: -value.numerator };
}
