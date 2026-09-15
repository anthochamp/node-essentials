import { DIGIT_SEVEN, DIGIT_ZERO } from "../../constants/ascii.js";

/**
 * Equivalent to C's `isodigit` — whether `code` is an ASCII octal digit
 * (`0`-`7`).
 */
export function isAsciiOctalDigit(code: number): boolean {
	return code >= DIGIT_ZERO && code <= DIGIT_SEVEN;
}
