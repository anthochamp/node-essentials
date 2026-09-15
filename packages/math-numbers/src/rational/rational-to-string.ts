import { Rational } from "./rational-types.js";

/**
 * `p/q`, or just `p` when the denominator is one — exact in any radix, since
 * both parts are integers.
 *
 * @param value The rational to render.
 * @param radix The base for both parts, from 2 to 36. Defaults to 10.
 */
export function rationalToString(
	value: Readonly<Rational>,
	radix?: number,
): string {
	if (value.denominator === 1n) {
		return value.numerator.toString(radix);
	}

	return `${value.numerator.toString(radix)}/${value.denominator.toString(radix)}`;
}
