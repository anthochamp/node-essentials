import { DIGIT_NINE, DIGIT_ZERO } from "../../constants/ascii.js";

/** Equivalent to C's `isdigit` — whether `code` is an ASCII digit (`0`-`9`). */
export function isAsciiDigit(code: number): boolean {
	return code >= DIGIT_ZERO && code <= DIGIT_NINE;
}
